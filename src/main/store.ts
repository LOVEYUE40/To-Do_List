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
import { Workbook } from 'exceljs'
import type { AppData, AppSettings, DataSummary, ExportResult, ImportResult } from '@shared/types'
import { DEFAULT_LISTS, DEFAULT_SETTINGS, PRIORITY_META, SCHEMA_VERSION } from '@shared/constants'
import { formatDate, formatDateTime, validateAppData } from '@shared/utils'

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
 * 按磁盘上的 schemaVersion 逐级迁移到当前版本。
 *
 * 之前是无条件覆写版本号，等于宣称「旧结构就是新结构」——一旦真的需要改结构，
 * 就会静默接受形状不对的数据。这里保留升级入口，v1 尚无需任何变换。
 */
function migrate(data: AppData, raw: unknown): AppData {
  const onDisk = Number((raw as { schemaVersion?: unknown } | null)?.schemaVersion)
  const from = Number.isFinite(onDisk) && onDisk > 0 ? Math.floor(onDisk) : 1

  if (from > SCHEMA_VERSION) {
    console.warn(`[store] 数据版本 ${from} 高于当前支持的 ${SCHEMA_VERSION}，已按当前结构尽力读取`)
  }

  // 未来版本升级时在此按 from 逐级迁移，例如：if (from < 2) { ...变换... }

  return { ...data, schemaVersion: SCHEMA_VERSION }
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
  /** 临时文件序号：保证同一进程内每次写入的 tmp 名唯一 */
  private tmpSeq = 0
  /** 进行中的异步写。用于合并突发写入，避免多个 flush 互相叠加 */
  private flushing: Promise<void> | null = null

  /**
   * 生成唯一临时文件名。
   * 不能固定用 `${filePath}.tmp`：flush() 是异步的，可能与退出路径的 flushSync()
   * 并发，两个写入者操作同一个 tmp 文件会交错，rename 出去的可能是半截内容。
   */
  private tmpPath(): string {
    this.tmpSeq += 1
    return `${this.filePath}.${process.pid}.${this.tmpSeq}.tmp`
  }

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
      this.data = migrate(result.data, parsed)
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

  /**
   * 异步原子写：先写临时文件再 rename，避免中途崩溃产生半截 JSON。
   * 已有写入在途时直接复用同一个 Promise，避免突发防抖写入层层叠加。
   */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (!this.filePath) return
    if (this.flushing) return this.flushing

    const payload = JSON.stringify(this.data, null, 2)
    const tmp = this.tmpPath()
    this.flushing = (async () => {
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
      } finally {
        this.flushing = null
      }
    })()
    return this.flushing
  }

  /**
   * 退出流程使用：Electron 不等待异步钩子，必须同步落盘；与 flush() 一样走临时文件 + 重命名的原子路径。
   *
   * 与异步 flush() 的并发说明：两者使用各自唯一的 tmp 文件，所以不会再写出损坏内容；
   * 最坏情况只是「两个合法快照中后写者胜出」，即丢一次尚未提交的更新，而不是文件损坏。
   */
  flushSync(): void {
    try {
      if (!this.filePath) return
      mkdirSync(path.dirname(this.filePath), { recursive: true })
      const tmp = this.tmpPath()
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

  /**
   * 导出 Excel 任务报表（.xlsx）：含「任务」「清单」两个工作表，
   * 定位是可在 Excel / WPS 中直接查看的报表；完整数据备份仍应使用 JSON 导出。
   */
  async exportExcelFile(): Promise<ExportResult> {
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const fileName = `待办任务-${formatDate(Date.now())}.xlsx`
    const exportDir = this.data.settings.exportDir
    const options = {
      title: '导出 Excel 任务报表',
      defaultPath: exportDir ? path.join(exportDir, fileName) : fileName,
      filters: [{ name: 'Excel 工作表', extensions: ['xlsx'] }]
    }
    const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { path: null, canceled: true }
    try {
      const listNames = new Map(this.data.lists.map((list) => [list.id, list.name]))
      const workbook = new Workbook()

      const taskSheet = workbook.addWorksheet('任务')
      taskSheet.columns = [
        { header: '标题', key: 'title', width: 40 },
        { header: '所属清单', key: 'list', width: 14 },
        { header: '状态', key: 'status', width: 8 },
        { header: '优先级', key: 'priority', width: 10 },
        { header: '截止时间', key: 'dueAt', width: 18 },
        { header: '完成时间', key: 'completedAt', width: 18 },
        { header: '创建时间', key: 'createdAt', width: 18 },
        { header: '标签', key: 'tags', width: 20 },
        { header: '备注', key: 'note', width: 32 }
      ]
      const sortedItems = [...this.data.items].sort((a, b) => a.order - b.order)
      for (const item of sortedItems) {
        taskSheet.addRow({
          title: item.title,
          list: listNames.get(item.listId) ?? item.listId,
          status: item.done ? '已完成' : '进行中',
          priority: PRIORITY_META[item.priority].label,
          dueAt: formatDateTime(item.dueAt),
          completedAt: formatDateTime(item.completedAt),
          createdAt: formatDateTime(item.createdAt),
          tags: item.tags.join('、'),
          note: item.note ?? ''
        })
      }
      taskSheet.getRow(1).font = { bold: true }

      const listSheet = workbook.addWorksheet('清单')
      listSheet.columns = [
        { header: '清单名称', key: 'name', width: 18 },
        { header: '颜色', key: 'color', width: 12 },
        { header: '任务数', key: 'total', width: 10 },
        { header: '已完成', key: 'done', width: 10 }
      ]
      const sortedLists = [...this.data.lists].sort((a, b) => a.order - b.order)
      for (const list of sortedLists) {
        const items = this.data.items.filter((item) => item.listId === list.id)
        listSheet.addRow({
          name: list.name,
          color: list.color,
          total: items.length,
          done: items.filter((item) => item.done).length
        })
      }
      listSheet.getRow(1).font = { bold: true }

      await workbook.xlsx.writeFile(result.filePath)
      return { path: result.filePath }
    } catch (err) {
      console.error('[store] Excel 导出失败：', err)
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
