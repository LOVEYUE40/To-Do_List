import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { AppSettings, UpdateStatus } from '@shared/types'
import { IPC } from '@shared/constants'
import { store } from './store'
import { sendWhenReady, setQuitting } from './windowManager'

/** 启动后延迟检查，避开窗口初始化与首屏渲染 */
const STARTUP_CHECK_DELAY_MS = 8000
/** download-progress 触发非常密集，按 200ms 节流后再向渲染层推送 */
const PROGRESS_THROTTLE_MS = 200

let initialized = false
let lastStatus: UpdateStatus = { state: 'idle' }
let progressTimer: ReturnType<typeof setTimeout> | null = null
let pendingProgress: UpdateStatus | null = null

function publish(next: UpdateStatus): void {
  lastStatus = { ...next, checkedAt: Date.now() }
  sendWhenReady(IPC.evtUpdateStatus, lastStatus)
}

/** 读取当前状态：渲染层重挂载（如窗口形态切换导致整窗重建）后回放用 */
export function getUpdateStatus(): UpdateStatus {
  return lastStatus
}

function unsupportedStatus(): UpdateStatus {
  return {
    state: 'unsupported',
    message: '开发模式（未打包）下不检查更新，安装打包后的版本才会启用自动更新。',
    checkedAt: Date.now()
  }
}

function normalizeNotes(notes: unknown): string | undefined {
  if (typeof notes === 'string') return notes.slice(0, 1200)
  if (Array.isArray(notes)) {
    const text = notes
      .map((entry) => {
        const item = entry as { version?: string; note?: string | null }
        return [item.version ? `v${item.version}` : '', item.note ?? ''].filter(Boolean).join('\n')
      })
      .filter(Boolean)
      .join('\n\n')
    return text ? text.slice(0, 1200) : undefined
  }
  return undefined
}

/** 把底层异常翻译成用户可读的原因，避免把堆栈直接抛给界面 */
function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/net::|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ECONNRESET|getaddrinfo|ERR_INTERNET/i.test(message)) {
    return '网络不可达，无法连接更新服务器，请检查网络后重试。'
  }
  if (/404|Cannot find|latest\.ya?ml|no published versions|Cannot download/i.test(message)) {
    return '未在发布页找到 latest.yml，请确认已通过 GitHub Releases 发布带更新元数据的安装包。'
  }
  if (/403|private|Unauthorized|Not Found/i.test(message)) {
    return '发布仓库不可访问：自动更新无法匿名读取私有仓库的 Release，请将仓库设为公开。'
  }
  return message || '更新失败，请稍后重试。'
}

function queueProgress(next: UpdateStatus): void {
  pendingProgress = next
  if (progressTimer) return
  progressTimer = setTimeout(() => {
    progressTimer = null
    if (!pendingProgress) return
    const payload = pendingProgress
    pendingProgress = null
    publish(payload)
  }, PROGRESS_THROTTLE_MS)
}

function flushProgress(): void {
  if (progressTimer) {
    clearTimeout(progressTimer)
    progressTimer = null
  }
  if (!pendingProgress) return
  const payload = pendingProgress
  pendingProgress = null
  publish(payload)
}

function registerUpdaterEvents(): void {
  autoUpdater.on('checking-for-update', () => {
    publish({ state: 'checking', message: '正在检查更新…' })
  })

  autoUpdater.on('update-available', (info) => {
    publish({
      state: 'available',
      version: info.version,
      releaseNotes: normalizeNotes(info.releaseNotes),
      message: `发现新版本 v${info.version}`
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    publish({
      state: 'not-available',
      version: info.version,
      message: '当前已是最新版本'
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    queueProgress({
      state: 'downloading',
      percent: Math.max(0, Math.min(100, Math.round(progress.percent))),
      transferred: progress.transferred,
      total: progress.total,
      message: '正在下载更新包…'
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    flushProgress()
    publish({
      state: 'downloaded',
      version: info.version,
      releaseNotes: normalizeNotes(info.releaseNotes),
      percent: 100,
      message: '更新已下载完成，重启后生效'
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] 更新过程出错：', err)
    publish({ state: 'error', message: describeError(err) })
  })
}

/** 应用启动时调用一次；开发环境只记录状态，不注册任何网络行为 */
export function initUpdater(settings: AppSettings): void {
  if (initialized) return
  initialized = true

  if (!app.isPackaged) {
    lastStatus = unsupportedStatus()
    console.info('[updater] 未打包运行，跳过自动更新初始化')
    return
  }

  try {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    const feedUrl = (settings.updateFeedUrl ?? '').trim()
    if (feedUrl) {
      autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
      console.info('[updater] 使用自定义更新源：', feedUrl)
    }

    registerUpdaterEvents()

    if (settings.autoUpdateCheck) {
      setTimeout(() => {
        void checkForUpdates()
      }, STARTUP_CHECK_DELAY_MS)
    }
  } catch (err) {
    console.error('[updater] 初始化失败：', err)
    lastStatus = { state: 'error', message: '更新模块初始化失败，请查看主进程日志。', checkedAt: Date.now() }
  }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    lastStatus = unsupportedStatus()
    return lastStatus
  }
  if (!initialized) initUpdater(store.getSettings())

  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    console.error('[updater] 检查更新失败：', err)
    publish({ state: 'error', message: describeError(err) })
  }
  return lastStatus
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  if (!app.isPackaged) return lastStatus
  try {
    await autoUpdater.downloadUpdate()
  } catch (err) {
    console.error('[updater] 下载更新失败：', err)
    publish({ state: 'error', message: describeError(err) })
  }
  return lastStatus
}

/** 退出并安装：必须先置 quitting，否则会被「关闭即隐藏到托盘」的逻辑拦下 */
export function quitAndInstall(): void {
  if (!app.isPackaged) return
  setQuitting(true)
  try {
    autoUpdater.quitAndInstall(false, true)
  } catch (err) {
    console.error('[updater] 重启安装失败：', err)
  }
}
