import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/constants'
import type {
  AppData,
  AppInfo,
  AppSettings,
  DataSummary,
  DesktopApi,
  DesktopEvent,
  ExportResult,
  ImportResult,
  UpdateStatus,
  WindowMode
} from '@shared/types'

/** 允许渲染层订阅的主进程事件白名单 */
const EVENT_CHANNELS: Record<DesktopEvent, string> = {
  reminder: IPC.evtReminder,
  'shortcut:quick-add': IPC.evtQuickAdd,
  'window:mode-changed': IPC.evtModeChanged,
  'settings:changed': IPC.evtSettingsChanged,
  'view:request': IPC.evtViewRequest,
  'update:status': IPC.evtUpdateStatus
}

/**
 * 受限桌面 API：渲染层只能看到这里显式列出的方法，
 * 无法直接访问 Node、文件系统或任意 IPC 通道。
 */
const api: DesktopApi = {
  data: {
    load: () => ipcRenderer.invoke(IPC.dataLoad) as Promise<AppData>,
    save: (patch: Partial<AppData>) => ipcRenderer.invoke(IPC.dataSave, patch) as Promise<void>,
    summary: () => ipcRenderer.invoke(IPC.dataSummary) as Promise<DataSummary>,
    exportFile: () => ipcRenderer.invoke(IPC.dataExport) as Promise<ExportResult>,
    importFile: () => ipcRenderer.invoke(IPC.dataImport) as Promise<ImportResult>,
    clearAll: () => ipcRenderer.invoke(IPC.dataClear) as Promise<AppData>,
    openFolder: () => ipcRenderer.invoke(IPC.dataOpenFolder) as Promise<boolean>
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet) as Promise<AppSettings>,
    set: (patch: Partial<AppSettings>) => ipcRenderer.invoke(IPC.settingsSet, patch) as Promise<AppSettings>
  },
  window: {
    setMode: (mode: WindowMode) => ipcRenderer.invoke(IPC.windowSetMode, mode) as Promise<void>,
    setAlwaysOnTop: (value: boolean) =>
      ipcRenderer.invoke(IPC.windowSetAlwaysOnTop, value) as Promise<void>,
    minimize: () => ipcRenderer.send(IPC.windowMinimize),
    hide: () => ipcRenderer.send(IPC.windowHide),
    quit: () => ipcRenderer.send(IPC.windowQuit)
  },
  system: {
    notify: (payload: { title: string; body: string }) =>
      ipcRenderer.invoke(IPC.systemNotify, payload) as Promise<void>,
    setLaunchAtLogin: (value: boolean) =>
      ipcRenderer.invoke(IPC.systemLaunchAtLogin, value) as Promise<boolean>,
    openExternal: (url: string) => ipcRenderer.invoke(IPC.systemOpenExternal, url) as Promise<boolean>
  },
  dialog: {
    pickDirectory: () => ipcRenderer.invoke(IPC.dialogPickDirectory) as Promise<string | null>
  },
  update: {
    status: () => ipcRenderer.invoke(IPC.updateStatus) as Promise<UpdateStatus>,
    check: () => ipcRenderer.invoke(IPC.updateCheck) as Promise<UpdateStatus>,
    download: () => ipcRenderer.invoke(IPC.updateDownload) as Promise<UpdateStatus>,
    install: () => ipcRenderer.send(IPC.updateInstall)
  },
  app: {
    version: () => ipcRenderer.invoke(IPC.appVersion) as Promise<string>,
    platform: () => ipcRenderer.invoke(IPC.appPlatform) as Promise<string>,
    info: () => ipcRenderer.invoke(IPC.appInfo) as Promise<AppInfo>
  },
  on: (event: DesktopEvent, cb: (payload: unknown) => void) => {
    const channel = EVENT_CHANNELS[event]
    if (!channel) return () => undefined
    const listener = (_event: unknown, payload: unknown): void => cb(payload)
    ipcRenderer.on(channel, listener as (...args: unknown[]) => void)
    return () => {
      ipcRenderer.removeListener(channel, listener as (...args: unknown[]) => void)
    }
  }
}

contextBridge.exposeInMainWorld('desktop', api)
