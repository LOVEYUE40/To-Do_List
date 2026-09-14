/** 渲染层展示用的轻量格式化工具 */

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

/** 把 Electron accelerator 转成用户可读的展示形式 */
export function formatShortcut(accelerator: string): string {
  if (!accelerator) return '未设置'
  return accelerator
    .replace(/CommandOrControl|CmdOrCtrl/g, 'Ctrl')
    .replace(/Command|Cmd/g, 'Cmd')
    .replace(/Control/g, 'Ctrl')
    .replace(/\+/g, ' + ')
}

export function formatCount(count: number, unit: string): string {
  return `${count} ${unit}`
}

/** 把中文标签截断到指定长度，避免窄窗口下换行 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

/** 时间戳 -> <input type="datetime-local"> 需要的本地时间字符串 */
export function toDatetimeLocal(ts: number | null | undefined): string {
  if (!ts) return ''
  const date = new Date(ts)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

/** <input type="datetime-local"> 的值 -> 时间戳 */
export function fromDatetimeLocal(value: string): number | null {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

/** 提前提醒时长选项 */
export const REMIND_LEAD_OPTIONS = [
  { value: 0, label: '准时提醒' },
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 1440, label: '提前 1 天' }
]
