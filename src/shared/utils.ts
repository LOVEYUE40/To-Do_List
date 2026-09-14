import type {
  AppData,
  AppSettings,
  ColorScheme,
  FilterStatus,
  Priority,
  SortKey,
  TodoItem,
  TodoList,
  WindowBounds
} from './types'
import { DEFAULT_SETTINGS, MAX_IMPORT_ITEMS, PRIORITY_ORDER, SCHEMA_VERSION, THEME_PRESETS } from './constants'

/* ------------------------------------------------------------------ */
/* 基础工具                                                            */
/* ------------------------------------------------------------------ */

let seq = 0

/** 生成稳定唯一的 id，避免依赖 crypto 在各端的差异 */
export function uid(prefix = 'id'): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(ts: number): number {
  return startOfDay(ts) + 24 * 60 * 60 * 1000 - 1
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function addDays(ts: number, days: number): number {
  return startOfDay(ts) + days * 24 * 60 * 60 * 1000
}

/** 时间戳格式化为 YYYY-MM-DD HH:mm */
export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 相对时间描述：今天 14:30 / 明天 09:00 / 已逾期 2 天 */
export function formatDueLabel(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return ''
  const today = startOfDay(now)
  const target = startOfDay(ts)
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`
  const diffDays = Math.round((target - today) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return ts < now ? `今天 ${time}（已过期）` : `今天 ${time}`
  if (diffDays === 1) return `明天 ${time}`
  if (diffDays === -1) return `昨天 ${time}（已过期）`
  if (diffDays < 0) return `${Math.abs(diffDays)} 天前（已过期）`
  if (diffDays < 7) return `${diffDays} 天后 ${time}`
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${time}`
}

/** 用于 mm:ss 或「x 分钟前」的简短描述 */
export function formatRelative(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return '从未'
  const diff = now - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  const days = Math.floor(diff / 86_400_000)
  if (days < 30) return `${days} 天前`
  return formatDate(ts)
}

/* ------------------------------------------------------------------ */
/* 筛选与排序                                                          */
/* ------------------------------------------------------------------ */

export interface FilterOptions {
  listId: string
  status: FilterStatus
  priority: Priority | 'any'
  keyword: string
  now?: number
}

export function matchesSmartView(item: TodoItem, listId: string, now: number): boolean {
  switch (listId) {
    case 'smart:all':
      return true
    case 'smart:today':
      return !item.done && !!item.dueAt && item.dueAt <= endOfDay(now) && item.dueAt >= startOfDay(now)
    case 'smart:overdue':
      return !item.done && !!item.dueAt && item.dueAt < now
    case 'smart:done':
      return item.done
    default:
      return item.listId === listId
  }
}

export function filterItems(items: TodoItem[], options: FilterOptions): TodoItem[] {
  const now = options.now ?? Date.now()
  const keyword = options.keyword.trim().toLowerCase()

  return items.filter((item) => {
    if (!matchesSmartView(item, options.listId, now)) return false

    switch (options.status) {
      case 'active':
        if (item.done) return false
        break
      case 'done':
        if (!item.done) return false
        break
      case 'today':
        if (item.done || !item.dueAt || !isSameDay(item.dueAt, now)) return false
        break
      case 'overdue':
        if (item.done || !item.dueAt || item.dueAt >= now) return false
        break
      default:
        break
    }

    if (options.priority !== 'any' && item.priority !== options.priority) return false

    if (keyword) {
      const haystack = `${item.title} ${item.note ?? ''} ${item.tags.join(' ')}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }

    return true
  })
}

export function sortItems(items: TodoItem[], key: SortKey): TodoItem[] {
  const sorted = [...items]
  const priorityRank = (p: Priority) => PRIORITY_ORDER.indexOf(p)

  switch (key) {
    case 'created':
      sorted.sort((a, b) => b.createdAt - a.createdAt)
      break
    case 'due':
      sorted.sort((a, b) => {
        if (!a.dueAt && !b.dueAt) return a.order - b.order
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return a.dueAt - b.dueAt
      })
      break
    case 'priority':
      sorted.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.order - b.order)
      break
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
      break
    default:
      sorted.sort((a, b) => a.order - b.order)
      break
  }

  // 已完成任务统一沉底，保持列表视觉稳定
  return sorted.sort((a, b) => Number(a.done) - Number(b.done))
}

/* ------------------------------------------------------------------ */
/* 统计                                                                */
/* ------------------------------------------------------------------ */

export interface TodoStats {
  total: number
  done: number
  active: number
  overdue: number
  dueToday: number
  completionRate: number
  streak: number
}

export function computeStats(items: TodoItem[], lists: TodoList[] = [], now = Date.now()): TodoStats {
  void lists
  const total = items.length
  const done = items.filter((i) => i.done).length
  const active = total - done
  const overdue = items.filter((i) => !i.done && !!i.dueAt && i.dueAt < now).length
  const dueToday = items.filter((i) => !i.done && !!i.dueAt && isSameDay(i.dueAt, now)).length
  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100)

  // 连续完成天数：从今天（或昨天）向前回溯，每天至少完成一个任务
  const completedDays = new Set(
    items.filter((i) => i.done && i.completedAt).map((i) => startOfDay(i.completedAt as number))
  )
  let streak = 0
  const today = startOfDay(now)
  let cursor = completedDays.has(today) ? today : addDays(today, -1)
  while (completedDays.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return { total, done, active, overdue, dueToday, completionRate, streak }
}

export interface TrendPoint {
  label: string
  created: number
  completed: number
}

export function buildTrend(items: TodoItem[], days: number, now = Date.now()): TrendPoint[] {
  const DAY_MS = 24 * 60 * 60 * 1000
  const today = startOfDay(now)
  const firstDay = today - (days - 1) * DAY_MS
  const points: TrendPoint[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = today - i * DAY_MS
    points.push({
      label: `${new Date(day).getMonth() + 1}/${new Date(day).getDate()}`,
      created: 0,
      completed: 0
    })
  }
  // 单次遍历按天分桶，替代每天两次全量扫描
  for (const item of items) {
    const createdOffset = Math.round((startOfDay(item.createdAt) - firstDay) / DAY_MS)
    if (createdOffset >= 0 && createdOffset < days) points[days - 1 - createdOffset].created += 1
    if (item.done && item.completedAt) {
      const doneOffset = Math.round((startOfDay(item.completedAt) - firstDay) / DAY_MS)
      if (doneOffset >= 0 && doneOffset < days) points[days - 1 - doneOffset].completed += 1
    }
  }
  return points
}

export interface ListStat {
  id: string
  name: string
  color: string
  total: number
  done: number
  rate: number
}

export function computeListStats(items: TodoItem[], lists: TodoList[]): ListStat[] {
  return lists
    .map((list) => {
      const owned = items.filter((i) => i.listId === list.id)
      const done = owned.filter((i) => i.done).length
      return {
        id: list.id,
        name: list.name,
        color: list.color,
        total: owned.length,
        done,
        rate: owned.length === 0 ? 0 : Math.round((done / owned.length) * 100)
      }
    })
    .sort((a, b) => b.total - a.total)
}

/* ------------------------------------------------------------------ */
/* 导入校验与数据规范化                                                */
/* ------------------------------------------------------------------ */

/** 导入数据允许出现的主题 id 白名单 */
const THEME_IDS = new Set<string>([...THEME_PRESETS.map((preset) => preset.id), 'custom'])
const COLOR_SCHEMES: ColorScheme[] = ['light', 'dark', 'system']
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

/** 窗口边界校验：四个字段必须是有限数字且尺寸合理，否则丢弃（回退到默认位置），防止导入数据把窗口移出屏幕 */
function normalizeBounds(raw: unknown): WindowBounds | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const input = raw as Partial<WindowBounds>
  const { x, y, width, height } = input
  if (![x, y, width, height].every((v) => typeof v === 'number' && Number.isFinite(v))) return undefined
  return {
    x: Math.round(x as number),
    y: Math.round(y as number),
    width: clamp(width as number, 200, 4000),
    height: clamp(height as number, 200, 4000)
  }
}

export function normalizeSettings(raw: unknown): AppSettings {
  const input = (raw ?? {}) as Partial<AppSettings>
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...input }
  merged.shortcuts = { ...DEFAULT_SETTINGS.shortcuts, ...(input.shortcuts ?? {}) }
  merged.opacity = clamp(Number(merged.opacity) || DEFAULT_SETTINGS.opacity, 0.3, 1)
  merged.glassAlpha = clamp(Number(merged.glassAlpha) || 0, 0, 1)
  merged.blur = clamp(Number(merged.blur) || 0, 0, 28)
  // 布尔字段强转：导入数据可能携带字符串 "false" / 1 等真值陷阱
  merged.alwaysOnTop = Boolean(merged.alwaysOnTop)
  merged.launchAtLogin = Boolean(merged.launchAtLogin)
  merged.disableHardwareAcceleration = Boolean(merged.disableHardwareAcceleration)
  merged.hardenReadability = Boolean(merged.hardenReadability)
  merged.theme = THEME_IDS.has(merged.theme) ? merged.theme : DEFAULT_SETTINGS.theme
  merged.colorScheme = COLOR_SCHEMES.includes(merged.colorScheme)
    ? merged.colorScheme
    : DEFAULT_SETTINGS.colorScheme
  merged.windowMode = merged.windowMode === 'window' ? 'window' : 'widget'
  merged.customAccent =
    typeof merged.customAccent === 'string' && HEX_COLOR_RE.test(merged.customAccent)
      ? merged.customAccent
      : DEFAULT_SETTINGS.customAccent
  merged.exportDir = typeof merged.exportDir === 'string' ? merged.exportDir : ''
  // 引导版本取非负整数：非法值（NaN / 负数 / 字符串）一律回退为「从未看过」
  const guideVersion = Math.floor(Number(merged.guideVersion))
  merged.guideVersion = Number.isFinite(guideVersion) && guideVersion > 0 ? guideVersion : 0
  merged.autoUpdateCheck = Boolean(merged.autoUpdateCheck)
  merged.updateFeedUrl = typeof merged.updateFeedUrl === 'string' ? merged.updateFeedUrl : ''
  merged.bounds = normalizeBounds(merged.bounds)
  merged.schemaVersion = SCHEMA_VERSION
  return merged
}

export function normalizeItem(raw: unknown, fallbackListId: string, index: number): TodoItem | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Partial<TodoItem>
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) return null
  const now = Date.now()
  // NaN 虽然是 number 类型，但会破坏排序与智能视图过滤，必须一并拒绝
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
  return {
    id: typeof input.id === 'string' && input.id ? input.id : uid('task'),
    listId: typeof input.listId === 'string' && input.listId ? input.listId : fallbackListId,
    title,
    note: typeof input.note === 'string' ? input.note : '',
    done: Boolean(input.done),
    priority: (['none', 'low', 'medium', 'high'] as Priority[]).includes(input.priority as Priority)
      ? (input.priority as Priority)
      : 'none',
    tags: Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === 'string').slice(0, 12) : [],
    dueAt: finite(input.dueAt) ? input.dueAt : null,
    remindAt: finite(input.remindAt) ? input.remindAt : null,
    notified: Boolean(input.notified),
    createdAt: finite(input.createdAt) ? input.createdAt : now,
    updatedAt: finite(input.updatedAt) ? input.updatedAt : now,
    completedAt: finite(input.completedAt) ? input.completedAt : null,
    order: finite(input.order) ? input.order : index
  }
}

export function normalizeList(raw: unknown, index: number): TodoList | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Partial<TodoList>
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return null
  return {
    id: typeof input.id === 'string' && input.id ? input.id : uid('list'),
    name,
    color: typeof input.color === 'string' && input.color ? input.color : '#7C5CFF',
    order: typeof input.order === 'number' ? input.order : index,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : Date.now()
  }
}

export interface ValidationResult {
  ok: boolean
  error?: string
  data?: AppData
  counts?: { lists: number; items: number }
}

/** 校验并规范化导入的 JSON 数据 */
export function validateAppData(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: '文件内容不是合法的 JSON 对象' }
  }
  const input = raw as Partial<AppData>
  const rawLists = Array.isArray(input.lists) ? input.lists : null
  const rawItems = Array.isArray(input.items) ? input.items : null

  if (!rawLists || !rawItems) {
    return { ok: false, error: '缺少 lists 或 items 字段，可能不是本应用导出的数据' }
  }
  if (rawItems.length > MAX_IMPORT_ITEMS) {
    return { ok: false, error: `任务数量 ${rawItems.length} 超过上限 ${MAX_IMPORT_ITEMS}，请先拆分数据` }
  }

  const lists = rawLists.map(normalizeList).filter((l): l is TodoList => l !== null)
  if (lists.length === 0) {
    return { ok: false, error: '没有解析出任何有效清单' }
  }
  const fallbackListId = lists[0].id
  const seen = new Set<string>()
  const items = rawItems
    .map((item, index) => normalizeItem(item, fallbackListId, index))
    .filter((i): i is TodoItem => i !== null)
    .map((item) => {
      // 去重 id，避免导入后出现重复 key
      let id = item.id
      while (seen.has(id)) id = uid('task')
      seen.add(id)
      return { ...item, id }
    })

  return {
    ok: true,
    data: {
      schemaVersion: SCHEMA_VERSION,
      lists,
      items,
      settings: normalizeSettings(input.settings),
      updatedAt: Date.now()
    },
    counts: { lists: lists.length, items: items.length }
  }
}
