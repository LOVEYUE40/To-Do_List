import { create } from 'zustand'
import type { AppSettings, UpdateStatus, WindowMode } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/constants'
import { desktop } from '@/lib/desktop-api'

interface SettingsStore {
  settings: AppSettings
  ready: boolean
  /** 新手引导是否展开；仅内存态，故意不持久化，避免被写成「每次启动自动弹」 */
  guideOpen: boolean
  updateStatus: UpdateStatus
  load: () => Promise<void>
  /** 乐观更新 + 同步主进程 */
  patch: (patch: Partial<AppSettings>) => void
  /** 窗口形态切换会触发主进程整窗重建，不做乐观更新以免状态错乱 */
  setWindowMode: (mode: WindowMode) => void
  applyExternal: (settings: AppSettings) => void
  openGuide: () => void
  closeGuide: () => void
  setUpdateStatus: (status: UpdateStatus) => void
}

/** 滑块拖动会每步触发 patch，合并待发字段并防抖同步主进程 */
let pendingPatch: Partial<AppSettings> = {}
let settingsSyncTimer: ReturnType<typeof setTimeout> | null = null

function syncSettingsSoon(patch: Partial<AppSettings>): void {
  pendingPatch = { ...pendingPatch, ...patch }
  if (settingsSyncTimer) clearTimeout(settingsSyncTimer)
  settingsSyncTimer = setTimeout(() => {
    settingsSyncTimer = null
    const payload = pendingPatch
    pendingPatch = {}
    void desktop.settings.set(payload)
  }, 300)
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  ready: false,
  guideOpen: false,
  updateStatus: { state: 'idle' },

  load: async () => {
    try {
      const settings = await desktop.settings.get()
      set({ settings, ready: true })
    } catch (err) {
      // 与任务数据同理：失败也要放行 UI，避免永远停在载入页
      console.error('[settings] 载入设置失败，使用默认值：', err)
      set({ ready: true })
    }
  },

  patch: (patch) => {
    const next: AppSettings = {
      ...get().settings,
      ...patch,
      shortcuts: { ...get().settings.shortcuts, ...(patch.shortcuts ?? {}) }
    }
    set({ settings: next })
    syncSettingsSoon(patch)
  },

  setWindowMode: (mode) => {
    if (get().settings.windowMode === mode) return
    set({ settings: { ...get().settings, windowMode: mode } })
    void desktop.window.setMode(mode)
  },

  applyExternal: (settings) => {
    set({ settings })
  },

  openGuide: () => set({ guideOpen: true }),

  closeGuide: () => set({ guideOpen: false }),

  setUpdateStatus: (status) => set({ updateStatus: status })
}))

/** 常用派生选择器，避免在组件里重复计算 */
export function selectGlassAlpha(settings: Pick<AppSettings, 'opacity' | 'glassAlpha'>): number {
  // 低不透明度时自动加深玻璃底色，保证文字可读性
  const readable = settings.opacity <= 0.5 ? Math.min(1, settings.glassAlpha + 0.35) : settings.glassAlpha
  return readable
}
