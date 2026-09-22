import type { AppSettings, Priority } from './types'

/** 数据结构版本号，导入旧版本数据时据此做迁移 */
export const SCHEMA_VERSION = 1

/** 引导内容版本号：调高后已看过的用户会再次看到新手引导（v2：同步暖纸配色与 Excel 导出说明） */
export const GUIDE_VERSION = 2

/** 导入数据的安全上限，超过则给出提示 */
export const MAX_IMPORT_ITEMS = 5000

/** 发布与更新相关常量（GitHub Releases 为自动更新源） */
export const RELEASE = {
  owner: 'LOVEYUE40',
  repo: 'To-Do_List',
  /** 发布页地址，供「查看发布页」按钮使用 */
  get releasesUrl(): string {
    return `https://github.com/${RELEASE.owner}/${RELEASE.repo}/releases`
  }
} as const

/** 支持的系统范围声明，README 与帮助中心共用同一份口径 */
export const SUPPORT_SCOPE = {
  title: 'Windows 10（1809 及以上）/ Windows 11',
  detail: '仅支持 64 位（x64）系统。Windows 7 / 8 / 8.1 不受支持，原因是本应用基于 Electron 31 运行时，其官方最低要求为 Windows 10。'
} as const

/** 所有 IPC 通道名集中在此，避免主进程与预加载层拼写不一致 */
export const IPC = {
  dataLoad: 'data:load',
  dataSave: 'data:save',
  dataSummary: 'data:summary',
  dataExport: 'data:export',
  dataExportExcel: 'data:export-excel',
  dataImport: 'data:import',
  dataClear: 'data:clear',
  dataOpenFolder: 'data:open-folder',

  settingsGet: 'settings:get',
  settingsSet: 'settings:set',

  windowSetMode: 'window:set-mode',
  windowSetAlwaysOnTop: 'window:set-always-on-top',
  windowMinimize: 'window:minimize',
  windowHide: 'window:hide',
  windowQuit: 'window:quit',

  systemNotify: 'system:notify',
  systemLaunchAtLogin: 'system:launch-at-login',
  systemOpenExternal: 'system:open-external',

  dialogPickDirectory: 'dialog:pick-directory',

  updateStatus: 'update:status',
  updateCheck: 'update:check',
  updateDownload: 'update:download',
  updateInstall: 'update:install',

  appVersion: 'app:version',
  appPlatform: 'app:platform',
  appInfo: 'app:info',

  // 主进程 -> 渲染层事件
  evtReminder: 'evt:reminder',
  evtQuickAdd: 'evt:shortcut-quick-add',
  evtModeChanged: 'evt:window-mode-changed',
  evtSettingsChanged: 'evt:settings-changed',
  evtViewRequest: 'evt:view-request',
  evtUpdateStatus: 'evt:update-status'
} as const

export interface ThemePreset {
  id: string
  name: string
  /** 主强调色 */
  accent: string
  /** 次强调色，用于渐变 */
  accent2: string
  /** 光晕色 */
  glow: string
  /** 深色底色渐变（起、止） */
  darkBg: [string, string]
  /** 浅色底色渐变（起、止） */
  lightBg: [string, string]
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'aurora',
    name: '极光紫青',
    accent: '#7C5CFF',
    accent2: '#22D3EE',
    glow: '#A78BFA',
    darkBg: ['#161033', '#070B16'],
    lightBg: ['#F5F2FF', '#E9F8FF']
  },
  {
    id: 'ocean',
    name: '深海蓝',
    accent: '#0EA5E9',
    accent2: '#22D3EE',
    glow: '#38BDF8',
    darkBg: ['#062038', '#04101C'],
    lightBg: ['#EBF7FF', '#E4FBFF']
  },
  {
    id: 'sakura',
    name: '樱花粉',
    accent: '#F472B6',
    accent2: '#FB7185',
    glow: '#FDA4AF',
    darkBg: ['#2C1122', '#160A12'],
    lightBg: ['#FFF2F7', '#FFEAEF']
  },
  {
    id: 'forest',
    name: '森林绿',
    accent: '#22C55E',
    accent2: '#84CC16',
    glow: '#4ADE80',
    darkBg: ['#0A2619', '#061410'],
    lightBg: ['#EFFBF2', '#F4FCE8']
  },
  {
    id: 'sunset',
    name: '日落橙红',
    accent: '#F97316',
    accent2: '#EF4444',
    glow: '#FB923C',
    darkBg: ['#2C1409', '#170A06'],
    lightBg: ['#FFF4EB', '#FFECEC']
  },
  {
    id: 'warmpaper',
    name: '暖纸',
    accent: '#C9843E',
    accent2: '#E3B23C',
    glow: '#EFD9A8',
    darkBg: ['#221A10', '#120D07'],
    lightBg: ['#FAF4E6', '#F3E7CE']
  }
]

export const PRIORITY_META: Record<Priority, { label: string; color: string; short: string }> = {
  none: { label: '无优先级', color: '#94A3B8', short: '无' },
  low: { label: '低优先级', color: '#38BDF8', short: '低' },
  medium: { label: '中优先级', color: '#F59E0B', short: '中' },
  high: { label: '高优先级', color: '#EF4444', short: '高' }
}

export const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low', 'none']

export const DEFAULT_SHORTCUTS = {
  toggle: 'CommandOrControl+Alt+T',
  quickAdd: 'CommandOrControl+Alt+N'
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SCHEMA_VERSION,
  windowMode: 'widget',
  alwaysOnTop: true,
  opacity: 0.96,
  glassAlpha: 0.72,
  blur: 18,
  theme: 'aurora',
  customAccent: '#7C5CFF',
  colorScheme: 'dark',
  launchAtLogin: false,
  disableHardwareAcceleration: false,
  hardenReadability: true,
  exportDir: '',
  guideVersion: 0,
  autoUpdateCheck: true,
  updateFeedUrl: '',
  shortcuts: { ...DEFAULT_SHORTCUTS }
}

export const DEFAULT_LISTS = [
  { id: 'list_inbox', name: '收集箱', color: '#7C5CFF' },
  { id: 'list_work', name: '工作', color: '#22D3EE' },
  { id: 'list_life', name: '生活', color: '#22C55E' }
]

/** 智能视图（虚拟清单），id 以 smart: 前缀标识 */
export const SMART_VIEWS = [
  { id: 'smart:all', name: '全部任务', hint: '所有清单的任务' },
  { id: 'smart:today', name: '今天到期', hint: '今天需要完成' },
  { id: 'smart:overdue', name: '已逾期', hint: '已经过了截止时间' },
  { id: 'smart:done', name: '已完成', hint: '历史完成记录' }
]

/** 侧边栏 / 托盘快捷操作可能跳转到的视图 */
export const VIEW_IDS = ['todo', 'stats', 'data', 'settings', 'help'] as const

/** 运行时校验用的视图白名单，供主进程事件过滤与渲染层兜底复用 */
export const VIEW_ID_SET: ReadonlySet<string> = new Set<string>(VIEW_IDS)

export const STORAGE_KEYS = {
  uiState: 'todo-widget.ui-state.v1'
} as const
