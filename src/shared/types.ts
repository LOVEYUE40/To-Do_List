/**
 * 主进程 / 预加载 / 渲染层三端共享的类型契约。
 * 任何跨进程的结构变更都必须先在此处声明，避免契约漂移。
 */

export type Priority = 'none' | 'low' | 'medium' | 'high'

export type WindowMode = 'widget' | 'window'

export type ColorScheme = 'light' | 'dark' | 'system'

export type ThemeId = 'aurora' | 'ocean' | 'sakura' | 'forest' | 'sunset' | 'midnight' | 'custom'

/** 任务状态筛选维度 */
export type FilterStatus = 'all' | 'active' | 'done' | 'today' | 'overdue'

/** 任务排序维度 */
export type SortKey = 'manual' | 'created' | 'due' | 'priority' | 'title'

/** 主视图标识 */
export type ViewId = 'todo' | 'stats' | 'data' | 'settings' | 'help'

export interface TodoItem {
  id: string
  listId: string
  title: string
  note?: string
  done: boolean
  priority: Priority
  tags: string[]
  /** 截止时间戳（毫秒） */
  dueAt?: number | null
  /** 提醒时间戳（毫秒） */
  remindAt?: number | null
  /** 是否已经弹过提醒，用于幂等去重 */
  notified?: boolean
  createdAt: number
  updatedAt: number
  completedAt?: number | null
  order: number
}

export interface TodoList {
  id: string
  name: string
  color: string
  order: number
  createdAt: number
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ShortcutSettings {
  /** 显示 / 隐藏窗口 */
  toggle: string
  /** 快速新增任务 */
  quickAdd: string
}

export interface AppSettings {
  schemaVersion: number
  windowMode: WindowMode
  alwaysOnTop: boolean
  /** 整窗不透明度 0.3 ~ 1（渲染层根容器 opacity，含文字） */
  opacity: number
  /** 玻璃底色不透明度 0 ~ 1 */
  glassAlpha: number
  /** 毛玻璃模糊强度 0 ~ 28 px */
  blur: number
  theme: ThemeId
  customAccent: string
  colorScheme: ColorScheme
  launchAtLogin: boolean
  /** 部分显卡驱动下透明窗口出现黑底时的兜底开关，需重启生效 */
  disableHardwareAcceleration: boolean
  /** 低透明度时自动增强文字对比度 */
  hardenReadability: boolean
  /** 导出 JSON 的默认保存目录，空字符串表示使用系统默认位置 */
  exportDir: string
  /** 已读引导版本，0 表示从未看过；与 GUIDE_VERSION 比较决定是否自动弹出 */
  guideVersion: number
  /** 启动后是否静默检查更新 */
  autoUpdateCheck: boolean
  /** 更新源覆盖地址，空字符串表示使用打包内置的更新源 */
  updateFeedUrl: string
  bounds?: WindowBounds
  shortcuts: ShortcutSettings
}

export interface AppData {
  schemaVersion: number
  lists: TodoList[]
  items: TodoItem[]
  settings: AppSettings
  updatedAt: number
}

/** 主进程推送提醒后，渲染层用于刷新列表的载荷 */
export interface ReminderPayload {
  id: string
  title: string
  firedAt: number
}

export interface ImportResult {
  data: AppData | null
  fileName?: string
  error?: string
  counts?: { lists: number; items: number }
  canceled?: boolean
}

export interface ExportResult {
  path: string | null
  canceled?: boolean
}

export interface DataSummary {
  path: string
  updatedAt: number
  listCount: number
  itemCount: number
  doneCount: number
  bytes: number
}

/** 自动更新状态机 */
export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unsupported'

export interface UpdateStatus {
  state: UpdateState
  /** 可更新 / 已下载完成的目标版本号 */
  version?: string
  releaseNotes?: string
  /** 下载进度百分比 0 ~ 100 */
  percent?: number
  /** 已下载字节数 */
  transferred?: number
  /** 总字节数 */
  total?: number
  /** 失败或不可用时的可读原因 */
  message?: string
  checkedAt?: number
}

/** 运行环境信息，用于应用内展示系统兼容性判定 */
export interface AppInfo {
  version: string
  platform: string
  arch: string
  /** os.release() 原始值，如 10.0.19045 */
  osRelease: string
  /** 人类可读的系统名称，如 Windows 10 / 11 */
  osVersion: string
  /** 是否落在受支持的 Windows 10 (1809+) / Windows 11 64 位范围内 */
  supported: boolean
  /** 不受支持时的原因说明，受支持时为空 */
  supportHint: string
  isPackaged: boolean
  electron: string
  chrome: string
}

export type DesktopEvent =
  | 'reminder'
  | 'shortcut:quick-add'
  | 'window:mode-changed'
  | 'settings:changed'
  | 'view:request'
  | 'update:status'

export interface DesktopApi {
  data: {
    load(): Promise<AppData>
    save(patch: Partial<AppData>): Promise<void>
    summary(): Promise<DataSummary>
    exportFile(): Promise<ExportResult>
    importFile(): Promise<ImportResult>
    clearAll(): Promise<AppData>
    openFolder(): Promise<boolean>
  }
  settings: {
    get(): Promise<AppSettings>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
  }
  window: {
    setMode(mode: WindowMode): Promise<void>
    setAlwaysOnTop(value: boolean): Promise<void>
    minimize(): void
    hide(): void
    quit(): void
  }
  system: {
    notify(payload: { title: string; body: string }): Promise<void>
    setLaunchAtLogin(value: boolean): Promise<boolean>
    /** 仅允许 https 且 host 为 github.com 的链接，主进程侧会二次校验 */
    openExternal(url: string): Promise<boolean>
  }
  dialog: {
    /** 打开系统目录选择器，返回所选目录绝对路径；取消时返回 null */
    pickDirectory(): Promise<string | null>
  }
  update: {
    /** 读取当前更新状态，用于渲染层重挂载后回放 */
    status(): Promise<UpdateStatus>
    /** 主动检查更新；开发环境返回 unsupported */
    check(): Promise<UpdateStatus>
    /** 用户确认后开始下载新版本 */
    download(): Promise<UpdateStatus>
    /** 退出并安装已下载的更新 */
    install(): void
  }
  app: {
    version(): Promise<string>
    platform(): Promise<string>
    /** 运行环境与系统兼容性判定 */
    info(): Promise<AppInfo>
  }
  on(event: DesktopEvent, cb: (payload: unknown) => void): () => void
}

declare global {
  interface Window {
    desktop?: DesktopApi
  }
}
