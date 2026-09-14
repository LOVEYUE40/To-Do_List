import { app, BrowserWindow, dialog } from 'electron'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import type { AppData, AppSettings, DataSummary, ExportResult, ImportResult } from '@shared/types'
import { DEFAULT_LISTS, DEFAULT_SETTINGS, SCHEMA_VERSION } from '@shared/constants'
import { formatDate, validateAppData } from '@shared/utils'

const SAVE_DEBOUNCE_MS = 300
const MAX_BACKUPS = 5

export function createDefaultData(): AppData {
  const now = Date.now()
  return {
    schemaVersion: SCHEMA_VERSION,
    lists: DEFAULT_LISTS.map((item, index) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      order: index,
      createdAt: now
    })),
    items: [],
    settings: { ...DEFAULT_SETTINGS, shortcuts: { ...DEFAULT_SETTINGS.shortcuts } },
    updatedAt: now
  }
}

/**
 * 主进程侧的唯一数据源：内存持有 + 防抖原子写盘。
 * 渲染层不直接接触文件系统，只通过 IPC 读写。
 */
class DataStore {
  private filePath = ''
  private backupDir = ''
  private data: AppData = createDefaultData()
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  /** 必须在 app ready 之前同步调用：用于读取「禁用硬件加速」等启动期设置 */
  initSync(): AppData {
    const dir = app.getPath('userData')
    this.filePath = path.join(dir, 'todo-data.json')
    this.backupDir = path.join(dir, 'backups')

    if (!existsSync(this.filePath)) {
      this.data = createDefaultData()
      this.flushSync()
      return this.data
    }

    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf-8')) as unknown
      const result = validateAppData(parsed)
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? '数据校验失败')
      }
      this.data = result.data
      this.data.schemaVersion = SCHEMA_VERSION
    } catch (err) {
      console.error('[store] 数据文件损坏，已改用默认数据：', err)
      this.moveCorruptFile()
      this.data = createDefaultData()
      this.flushSync()
    }
    return this.data
  }

  private moveCorruptFile(): void {
    try {
      if (!existsSync(this.filePath)) return
      mkdirSync(this.backupDir, { recursive: true })
      const target = path.join(this.backupDir, `todo-data.corrupt-${Date.now()}.json`)
      renameSync(this.filePath, target)
    } catch (err) {
      console.error('[store] 备份损坏文件失败：', err)
    }
  }

  get(): AppData {
    return this.data
  }

  getSettings(): AppSettings {
    return this.data.settings
  }

  patch(patch: Partial<AppData>): AppData {
    this.data = {
      ...this.data,
      ...patch,
      settings: patch.settings
        ? { ...this.data.settings, ...patch.settings, schemaVersion: SCHEMA_VERSION }
        : this.data.settings,
      updatedAt: Date.now()
    }
    this.scheduleSave()
    return this.data
  }

  setSettings(patch: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...patch, schemaVersion: SCHEMA_VERSION }
    this.data.updatedAt = Date.now()
    this.scheduleSave()
    return this.data.settings
  }

  scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.flush()
    }, SAVE_DEBOUNCE_MS)
  }

  /** 异步原子写：先写临时文件再 rename，避免中途崩溃产生半截 JSON */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (!this.filePath) return
    const payload = JSON.stringify(this.data, null, 2)
    const tmp = `${this.filePath}.tmp`
    try {
      await fsp.mkdir(path.dirname(this.filePath), { recursive: true })
      await fsp.writeFile(tmp, payload, 'utf-8')
      await fsp.rename(tmp, this.filePath)
    } catch (err) {
      console.error('[store] 原子写失败，降级为直接写：', err)
      try {
        await fsp.writeFile(this.filePath, payload, 'utf-8')
      } catch (inner) {
        console.error('[store] 直接写盘同样失败：', inner)
      }
    }
  }

  /** 退出流程使用：Electron 不等待异步钩子，必须同步落盘；与 flush() 一样走临时文件 + 重命名的原子路径 */
  flushSync(): void {
    try {
      if (!this.filePath) return
      mkdirSync(path.dirname(this.filePath), { recursive: true })
      const tmp = `${this.filePath}.tmp`
      writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8')
      renameSync(tmp, this.filePath)
    } catch (err) {
      console.error('[store] 同步写盘失败：', err)
      try {
        writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
      } catch (inner) {
        console.error('[store] 原子重命名与直接写均失败：', inner)
      }
    }
  }

  summary(): DataSummary {
    let bytes = 0
    try {
      bytes = existsSync(this.filePath) ? statSync(this.filePath).size : 0
    } catch (err) {
      console.error('[store] 读取文件大小失败：', err)
    }
    return {
      path: this.filePath,
      updatedAt: this.data.updatedAt,
      listCount: this.data.lists.length,
      itemCount: this.data.items.length,
      doneCount: this.data.items.filter((item) => item.done).length,
      bytes
    }
  }

  backup(label: string): string | null {
    try {
      mkdirSync(this.backupDir, { recursive: true })
      // 文件名携带毫秒（补零保持字典序 = 时间序），避免同一秒内连续备份互相覆盖
      const stamp = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${String(Date.now() % 1000).padStart(3, '0')}`
      const target = path.join(this.backupDir, `todo-data-${stamp}-${label}.json`)
      writeFileSync(target, JSON.stringify(this.data, null, 2), 'utf-8')
      this.pruneBackups()
      return target
    } catch (err) {
      console.error('[store] 生成备份失败：', err)
      return null
    }
  }

  private pruneBackups(): void {
    try {
      // 同时清理损坏文件备份（todo-data.corrupt-*），避免无限累积
      const files = readdirSync(this.backupDir)
        .filter((name) => (name.startsWith('todo-data-') || name.startsWith('todo-data.corrupt-')) && name.endsWith('.json'))
        .sort()
      while (files.length > MAX_BACKUPS) {
        const oldest = files.shift()
        if (!oldest) break
        unlinkSync(path.join(this.backupDir, oldest))
      }
    } catch (err) {
      console.error('[store] 清理历史备份失败：', err)
    }
  }

  async exportFile(): Promise<ExportResult> {
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const fileName = `待办数据-${formatDate(Date.now())}.json`
    const exportDir = this.data.settings.exportDir
    const options = {
      title: '导出待办数据',
      defaultPath: exportDir ? path.join(exportDir, fileName) : fileName,
      filters: [{ name: 'JSON 数据文件', extensions: ['json'] }]
    }
    const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { path: null, canceled: true }
    try {
      await fsp.writeFile(result.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
      return { path: result.filePath }
    } catch (err) {
      console.error('[store] 导出失败：', err)
      return { path: null }
    }
  }

  async importFile(): Promise<ImportResult> {
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const options = {
      title: '导入待办数据',
      properties: ['openFile' as const],
      filters: [{ name: 'JSON 数据文件', extensions: ['json'] }]
    }
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) {
      return { data: null, canceled: true }
    }
    const filePath = result.filePaths[0]
    try {
      const raw = JSON.parse(await fsp.readFile(filePath, 'utf-8')) as unknown
      const validated = validateAppData(raw)
      if (!validated.ok || !validated.data) {
        return { data: null, fileName: path.basename(filePath), error: validated.error }
      }
      this.backup('before-import')
      this.data = validated.data
      await this.flush()
      return {
        data: validated.data,
        fileName: path.basename(filePath),
        counts: validated.counts
      }
    } catch (err) {
      console.error('[store] 导入失败：', err)
      return { data: null, fileName: path.basename(filePath), error: '文件解析失败，请确认是合法的 JSON 文件' }
    }
  }

  async clearAll(): Promise<AppData> {
    this.backup('before-clear')
    const settings = this.data.settings
    const fresh = createDefaultData()
    fresh.settings = settings
    this.data = fresh
    await this.flush()
    return this.data
  }
}

export const store = new DataStore()
