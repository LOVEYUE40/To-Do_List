import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron'
import type {
  AppData,
  AppInfo,
  AppSettings,
  DataSummary,
  ExportResult,
  ImportResult,
  UpdateStatus,
  WindowMode
} from '@shared/types'
import { IPC } from '@shared/constants'
import { normalizeItemsPatch, normalizeListsPatch, normalizeSettings } from '@shared/utils'
import { store } from './store'
import {
  applyAlwaysOnTop,
  captureBounds,
  getMainWindow,
  rebuildWindow,
  sendWhenReady,
  setQuitting
} from './windowManager'
import { registerShortcuts } from './shortcuts'
import { refreshTray, requestMode, updateTrayCounts } from './tray'
import { runReminderCheck } from './reminders'
import { getAppInfo } from './systemInfo'
import { checkForUpdates, downloadUpdate, getUpdateStatus, quitAndInstall } from './updater'

/**
 * 所有系统能力都经过白名单 IPC 暴露给渲染层，
 * 渲染层运行在 contextIsolation 下，不接触 Node 与文件系统。
 */

/**
 * 设置变化后的统一副作用。通过 next 与 previous 的字段差异判断，
 * 导入数据与手动改设置走同一条路径，避免托盘状态与实际行为脱节。
 * store.setSettings 对未变更字段保留原引用，可安全用引用/值比较。
 */
function applySettingsSideEffects(next: AppSettings, previous: AppSettings): void {
  if (next.alwaysOnTop !== previous.alwaysOnTop) applyAlwaysOnTop(next.alwaysOnTop)
  if (next.launchAtLogin !== previous.launchAtLogin) {
    try {
      app.setLoginItemSettings({ openAtLogin: next.launchAtLogin })
    } catch (err) {
      console.error('[ipc] 设置开机自启失败：', err)
    }
  }
  if (next.shortcuts !== previous.shortcuts) registerShortcuts(next.shortcuts)
  if (next.windowMode !== previous.windowMode) {
    // windowMode 变化必须整窗重建（frame/transparent 为创建期参数），复用托盘同款逻辑但不重复写设置
    const bounds = captureBounds(previous.bounds)
    store.setSettings({ bounds })
    rebuildWindow(next)
  }
  refreshTray(next)
}

export function registerIpcHandlers(): void {
  /* -------------------------------- 数据 -------------------------------- */

  ipcMain.handle(IPC.dataLoad, (): AppData => store.get())

  ipcMain.handle(IPC.dataSave, (_event, patch: Partial<AppData>): boolean => {
    if (!patch || typeof patch !== 'object') return false
    const safe: Partial<AppData> = {}

    // 必须先解析 lists：items 的 fallbackListId 依赖它，
    // 否则新建清单与新增任务同时提交时，任务会被挂到错误的清单上。
    if (patch.lists !== undefined) {
      const lists = normalizeListsPatch(patch.lists)
      if (lists) safe.lists = lists
    }
    if (patch.items !== undefined) {
      const fallbackListId = safe.lists?.[0]?.id ?? store.get().lists[0]?.id ?? 'list_inbox'
      const items = normalizeItemsPatch(patch.items, fallbackListId)
      if (items) safe.items = items
    }

    store.patch(safe)
    runReminderCheck()
    // 数据保存只影响任务数量，轻量刷新 tooltip 即可，不重建整个菜单
    updateTrayCounts()
    return true
  })

  ipcMain.handle(IPC.dataSummary, (): DataSummary => store.summary())

  ipcMain.handle(IPC.dataExport, async (): Promise<ExportResult> => store.exportFile())

  ipcMain.handle(IPC.dataExportExcel, async (): Promise<ExportResult> => store.exportExcelFile())

  ipcMain.handle(IPC.dataImport, async (): Promise<ImportResult> => {
    const previous = store.getSettings()
    const result = await store.importFile()
    if (result.data) {
      // 导入的设置必须走同一套副作用：置顶、自启、快捷键、窗口形态、托盘
      applySettingsSideEffects(result.data.settings, previous)
      // 回灌渲染层：导入可能改变主题等外观设置
      sendWhenReady(IPC.evtSettingsChanged, result.data.settings)
      runReminderCheck()
    }
    return result
  })

  ipcMain.handle(IPC.dataClear, async (): Promise<AppData> => {
    const data = await store.clearAll()
    refreshTray(data.settings)
    runReminderCheck()
    return data
  })

  /* ------------------------------- 设置 --------------------------------- */

  ipcMain.handle(IPC.settingsGet, (): AppSettings => store.getSettings())

  ipcMain.handle(IPC.settingsSet, (_event, patch: Partial<AppSettings>): AppSettings => {
    const previous = store.getSettings()
    const merged: Partial<AppSettings> = { ...(patch ?? {}) }

    // 每次设置写入都顺带记录当前窗口位置（有防抖，代价可忽略），
    // 这样拖动底部滑块这类高频改动也能把位置一并持久化。
    if (merged.bounds === undefined) {
      const bounds = captureBounds(previous.bounds)
      if (bounds) merged.bounds = bounds
    }

    // 合并到现有设置后整体走 normalizeSettings：既保留本次未提交的字段，
    // 又挡住非法值（windowMode / updateFeedUrl / 数值越界等）。
    // 这是主进程唯一的设置入口，渲染层即使被注入内容也无法写入越界配置。
    const next = store.setSettings(normalizeSettings({ ...previous, ...merged }))
    applySettingsSideEffects(next, previous)
    return next
  })

  /* ------------------------------- 窗口 --------------------------------- */

  ipcMain.handle(IPC.windowSetMode, (_event, mode: WindowMode): boolean => {
    // 必须先校验：非法值一旦落盘，windowManager 的 MIN_SIZES[mode] 会抛错，
    // 导致本次及后续每次启动都建不出窗口，只能手改 JSON 才能恢复。
    if (mode !== 'widget' && mode !== 'window') return false
    requestMode(mode)
    return true
  })

  ipcMain.handle(IPC.windowSetAlwaysOnTop, (_event, value: boolean): boolean => {
    store.setSettings({ alwaysOnTop: Boolean(value) })
    applyAlwaysOnTop(Boolean(value))
    return true
  })

  ipcMain.on(IPC.windowMinimize, () => {
    getMainWindow()?.minimize()
  })

  ipcMain.on(IPC.windowHide, () => {
    getMainWindow()?.hide()
  })

  ipcMain.on(IPC.windowQuit, () => {
    setQuitting(true)
    app.quit()
  })

  /* ------------------------------- 系统 --------------------------------- */

  ipcMain.handle(IPC.systemNotify, (_event, payload: { title?: string; body?: string }): boolean => {
    try {
      if (!Notification.isSupported()) return false
      // 钳制长度：系统通知由渲染层触发，超长正文会被系统截断甚至导致通知不显示
      const title = String(payload?.title ?? '').slice(0, 120) || '待办小组件'
      const body = String(payload?.body ?? '').slice(0, 500)
      new Notification({ title, body }).show()
      return true
    } catch (err) {
      console.error('[ipc] 发送系统通知失败：', err)
      return false
    }
  })

  ipcMain.handle(IPC.systemLaunchAtLogin, (_event, value: boolean): boolean => {
    try {
      app.setLoginItemSettings({ openAtLogin: Boolean(value) })
      store.setSettings({ launchAtLogin: Boolean(value) })
      return app.getLoginItemSettings().openAtLogin
    } catch (err) {
      console.error('[ipc] 切换开机自启失败：', err)
      return false
    }
  })

  ipcMain.handle(IPC.appVersion, (): string => app.getVersion())
  ipcMain.handle(IPC.appPlatform, (): string => process.platform)

  // 系统目录选择器：用于设置导出 JSON 的默认保存位置，取消时返回 null
  ipcMain.handle(IPC.dialogPickDirectory, async (): Promise<string | null> => {
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const options = {
      title: '选择导出保存位置',
      properties: ['openDirectory' as const, 'createDirectory' as const]
    }
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // 允许在数据管理页直接打开数据目录（仅本地文件系统，不加载远程内容）
  ipcMain.handle(IPC.dataOpenFolder, async (): Promise<boolean> => {
    const summary = store.summary()
    const err = await shell.openPath(summary.path.replace(/[\\/][^\\/]+$/, ''))
    if (err) {
      console.error('[ipc] 打开数据目录失败：', err)
      return false
    }
    return true
  })

  /* --------------------------- 应用信息与更新 --------------------------- */

  ipcMain.handle(IPC.appInfo, (): AppInfo => getAppInfo())

  ipcMain.handle(IPC.updateStatus, (): UpdateStatus => getUpdateStatus())

  ipcMain.handle(IPC.updateCheck, async (): Promise<UpdateStatus> => checkForUpdates())

  ipcMain.handle(IPC.updateDownload, async (): Promise<UpdateStatus> => downloadUpdate())

  ipcMain.on(IPC.updateInstall, () => {
    quitAndInstall()
  })

  // 仅放行 https + github.com：即便渲染层被注入内容，也无法借此打开任意地址
  ipcMain.handle(IPC.systemOpenExternal, async (_event, url: string): Promise<boolean> => {
    if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (err) {
      console.error('[ipc] 非法的外链地址：', url, err)
      return false
    }

    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    if (host !== 'github.com' && !host.endsWith('.github.com')) return false

    try {
      await shell.openExternal(parsed.toString())
      return true
    } catch (err) {
      console.error('[ipc] 打开外链失败：', err)
      return false
    }
  })
}
