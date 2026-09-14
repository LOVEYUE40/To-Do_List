import type {
  AppData,
  AppInfo,
  AppSettings,
  DataSummary,
  DesktopApi,
  DesktopEvent,
  ExportResult,
  ImportResult,
  UpdateStatus
} from '@shared/types'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEYS } from '@shared/constants'
import { normalizeSettings, validateAppData } from '@shared/utils'

/**
 * 浏览器环境降级实现：仅在 `npm run dev:renderer` 直接预览界面时启用。
 * 正式运行（Electron 内）永远走 preload 暴露的真实实现。
 */
const FALLBACK_KEY = 'todo-widget.fallback-data.v1'

function readFallback(): AppData {
  const empty: AppData = {
    schemaVersion: SCHEMA_VERSION,
    lists: [],
    items: [],
    settings: { ...DEFAULT_SETTINGS, shortcuts: { ...DEFAULT_SETTINGS.shortcuts } },
    updatedAt: Date.now()
  }
  const raw = localStorage.getItem(FALLBACK_KEY)
  if (!raw) {
    empty.lists = [
      { id: 'list_inbox', name: '收集箱', color: '#7C5CFF', order: 0, createdAt: Date.now() },
      { id: 'list_work', name: '工作', color: '#22D3EE', order: 1, createdAt: Date.now() },
      { id: 'list_life', name: '生活', color: '#22C55E', order: 2, createdAt: Date.now() }
    ]
    return empty
  }
  try {
    const parsed = JSON.parse(raw) as { lists?: unknown; items?: unknown; settings?: unknown }
    const validated = validateAppData({
      schemaVersion: SCHEMA_VERSION,
      lists: parsed.lists ?? [],
      items: parsed.items ?? [],
      settings: parsed.settings ?? {}
    })
    if (validated.ok && validated.data) return validated.data
  } catch (err) {
    console.error('[fallback] 本地数据解析失败，已重置：', err)
  }
  return { ...empty, settings: normalizeSettings(empty.settings) }
}

function writeFallback(data: AppData): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('[fallback] 本地写入失败：', err)
  }
}

/** 浏览器预览模式下所有更新能力统一返回「不支持」，避免界面出现无意义的报错 */
const UNSUPPORTED_UPDATE: UpdateStatus = {
  state: 'unsupported',
  message: '浏览器预览模式不支持自动更新，安装打包版本后才会启用。'
}

function createFallbackApi(): DesktopApi {
  let cache = readFallback()
  return {
    data: {
      load: async () => cache,
      save: async (patch) => {
        cache = { ...cache, ...patch, updatedAt: Date.now() }
        writeFallback(cache)
      },
      summary: async (): Promise<DataSummary> => ({
        path: '浏览器预览模式（localStorage）',
        updatedAt: cache.updatedAt,
        listCount: cache.lists.length,
        itemCount: cache.items.length,
        doneCount: cache.items.filter((item) => item.done).length,
        bytes: JSON.stringify(cache).length
      }),
      exportFile: async (): Promise<ExportResult> => {
        const blob = new Blob([JSON.stringify(cache, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `待办数据-${new Date().toISOString().slice(0, 10)}.json`
        anchor.click()
        URL.revokeObjectURL(url)
        return { path: '浏览器下载目录' }
      },
      importFile: async (): Promise<ImportResult> => ({ data: null, error: '浏览器预览模式不支持系统文件对话框' }),
      clearAll: async () => {
        cache = {
          schemaVersion: SCHEMA_VERSION,
          lists: cache.lists,
          items: [],
          settings: cache.settings,
          updatedAt: Date.now()
        }
        writeFallback(cache)
        return cache
      },
      openFolder: async () => false
    },
    settings: {
      get: async () => cache.settings,
      set: async (patch) => {
        cache = { ...cache, settings: normalizeSettings({ ...cache.settings, ...patch }) }
        writeFallback(cache)
        return cache.settings
      }
    },
    window: {
      setMode: async () => undefined,
      setAlwaysOnTop: async () => undefined,
      minimize: () => undefined,
      hide: () => undefined,
      quit: () => undefined
    },
    system: {
      notify: async (payload) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(payload.title, { body: payload.body })
        }
      },
      setLaunchAtLogin: async () => false,
      // 浏览器里没有系统级打开能力，直接透传失败，由调用方决定提示文案
      openExternal: async () => false
    },
    dialog: {
      pickDirectory: async () => null
    },
    update: {
      status: async (): Promise<UpdateStatus> => UNSUPPORTED_UPDATE,
      check: async (): Promise<UpdateStatus> => UNSUPPORTED_UPDATE,
      download: async (): Promise<UpdateStatus> => UNSUPPORTED_UPDATE,
      install: () => undefined
    },
    app: {
      version: async () => '1.0.0-preview',
      platform: async () => 'browser',
      info: async (): Promise<AppInfo> => ({
        version: '1.0.0-preview',
        platform: 'browser',
        arch: 'unknown',
        osRelease: 'unknown',
        osVersion: '浏览器预览模式',
        supported: true,
        supportHint: '',
        isPackaged: false,
        electron: 'unknown',
        chrome: 'unknown'
      })
    },
    on: (_event: DesktopEvent, _cb: (payload: unknown) => void) => () => undefined
  }
}

export const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.desktop)

export const desktop: DesktopApi = window.desktop ?? createFallbackApi()

/** 便于开发期调试：缓存一份 localStorage 键名 */
export const UI_STORAGE_KEY = STORAGE_KEYS.uiState

export type { AppSettings }
