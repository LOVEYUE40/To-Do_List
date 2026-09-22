import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import type { WindowBounds, WindowMode } from '@shared/types'
import { IPC } from '@shared/constants'
import { createAppIcon } from './assets'

let mainWindow: BrowserWindow | null = null
let quitting = false
/** 托盘等模块注册的窗口显示/隐藏回调（避免 windowManager ↔ tray 循环依赖） */
let visibilityListener: (() => void) | null = null

/** 托盘菜单的「显示/隐藏窗口」标签依赖此回调保持同步 */
export function setWindowVisibilityListener(listener: (() => void) | null): void {
  visibilityListener = listener
}

const MIN_SIZES: Record<WindowMode, { width: number; height: number }> = {
  widget: { width: 340, height: 430 },
  window: { width: 420, height: 560 }
}

/**
 * 校验开发服务器地址必须是本机。
 *
 * ELECTRON_RENDERER_URL 来自环境变量，若被污染成远程地址，
 * loadURL 会加载任意页面，而 preload（含退出、安装更新、完整数据读写）会跟着过去。
 * 非法时返回 null，调用方回退到打包后的本地页面。
 */
function resolveDevUrl(): string | null {
  const raw = process.env['ELECTRON_RENDERER_URL']
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    const isLocal =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]'
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:'
    if (isLocal && isHttp) return raw
    console.error('[window] 拒绝非本机的 ELECTRON_RENDERER_URL，已回退本地页面：', raw)
    return null
  } catch (err) {
    console.error('[window] ELECTRON_RENDERER_URL 不是合法 URL，已回退本地页面：', raw, err)
    return null
  }
}

/** 窗口只应展示本地页面：放行 file: 与开发期本机 dev-server */
function isAllowedNavigation(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') return true
    const devUrl = resolveDevUrl()
    return devUrl !== null && parsed.origin === new URL(devUrl).origin
  } catch {
    return false
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function setQuitting(value: boolean): void {
  quitting = value
}

export function isQuitting(): boolean {
  return quitting
}

/** 记忆窗口位置，最小化/最大化时不覆盖历史值 */
export function captureBounds(fallback?: WindowBounds): WindowBounds | undefined {
  if (!mainWindow || mainWindow.isDestroyed()) return fallback
  if (mainWindow.isMinimized() || mainWindow.isMaximized()) return fallback
  return mainWindow.getBounds()
}

/**
 * 创建窗口。注意 frame / transparent 属于创建期参数，
 * 运行时无法修改，因此模式切换必须整窗重建。
 */
export function createMainWindow(settings: {
  windowMode: WindowMode
  alwaysOnTop: boolean
  bounds?: WindowBounds
  customAccent: string
}): BrowserWindow {
  const mode = settings.windowMode
  const isWidget = mode === 'widget'
  const workArea = screen.getPrimaryDisplay().workAreaSize
  const saved = settings.bounds
  const width = Math.max(saved?.width ?? 420, MIN_SIZES[mode].width)
  const height = Math.max(saved?.height ?? 660, MIN_SIZES[mode].height)
  const x = saved?.x ?? Math.max(24, workArea.width - width - 48)
  const y = saved?.y ?? 96

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: MIN_SIZES[mode].width,
    minHeight: MIN_SIZES[mode].height,
    show: false,
    frame: !isWidget,
    transparent: isWidget,
    backgroundColor: isWidget ? '#00000000' : '#0B0F1A',
    hasShadow: !isWidget,
    resizable: true,
    maximizable: !isWidget,
    minimizable: true,
    fullscreenable: false,
    skipTaskbar: isWidget,
    alwaysOnTop: settings.alwaysOnTop,
    title: '待办小组件',
    icon: createAppIcon(settings.customAccent),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // preload 仅使用 contextBridge 与 ipcRenderer，沙箱模式下可用
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  })

  mainWindow = win

  // 导航加固：preload 暴露了退出、安装更新、完整数据读写等能力，
  // 一旦窗口被导航到外部来源，这些能力会一并带过去，因此只允许本地页面。
  // 应用内的外链统一走 system:open-external（主进程侧已做 https + github.com 白名单）。
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-attach-webview', (event) => event.preventDefault())
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      console.warn('[window] 已拦截非预期的页面跳转：', url)
      event.preventDefault()
    }
  })

  if (settings.alwaysOnTop) {
    win.setAlwaysOnTop(true, 'floating')
  }

  // 关闭时隐藏到托盘，除非处于真实退出流程
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      win.hide()
    }
  })

  // 显示/隐藏时通知托盘刷新菜单标签
  const notifyVisibility = (): void => {
    if (visibilityListener) visibilityListener()
  }
  win.on('show', notifyVisibility)
  win.on('hide', notifyVisibility)

  // 透明窗口在部分 Windows 驱动下 ready-to-show 可能不触发，
  // 因此除首帧绘制事件外再加一道兜底，避免出现「进程在跑但看不到窗口」。
  const revealWindow = (reason: string): void => {
    if (win.isDestroyed() || win.isVisible()) return
    win.show()
    console.info(`[window] 已显示窗口（触发来源：${reason}）`)
  }

  win.once('ready-to-show', () => revealWindow('ready-to-show'))
  win.webContents.once('did-finish-load', () => setTimeout(() => revealWindow('did-finish-load'), 300))
  const revealFallback = setTimeout(() => revealWindow('fallback-timeout'), 1800)
  win.on('closed', () => clearTimeout(revealFallback))

  const devUrl = resolveDevUrl()
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

/**
 * 销毁旧窗口并以新模式重建。
 * frame / transparent 属于窗口创建期参数，运行时无法修改，只能整窗重建；
 * 重建完成后渲染层会收到 window:mode-changed，用于给出切换反馈。
 */
export function rebuildWindow(settings: {
  windowMode: WindowMode
  alwaysOnTop: boolean
  bounds?: WindowBounds
  customAccent: string
}): BrowserWindow {
  const old = mainWindow
  mainWindow = null
  if (old && !old.isDestroyed()) {
    old.destroy()
  }
  const win = createMainWindow(settings)
  win.webContents.once('did-finish-load', () => {
    if (!win.isDestroyed()) win.webContents.send(IPC.evtModeChanged, settings.windowMode)
  })
  return win
}

export function applyAlwaysOnTop(value: boolean): void {
  const win = mainWindow
  if (!win || win.isDestroyed()) return
  win.setAlwaysOnTop(value, value ? 'floating' : 'normal')
}

export function showMainWindow(): void {
  const win = mainWindow
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function toggleMainWindow(): void {
  const win = mainWindow
  if (!win || win.isDestroyed()) return
  if (win.isVisible() && !win.isMinimized()) {
    win.hide()
  } else {
    showMainWindow()
  }
}

/** 渲染层可能尚未加载完成，等待 did-finish-load 后再投递事件 */
export function sendWhenReady(channel: string, payload?: unknown): void {
  const win = mainWindow
  if (!win || win.isDestroyed()) return
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', () => {
      if (!win.isDestroyed()) win.webContents.send(channel, payload)
    })
    return
  }
  win.webContents.send(channel, payload)
}
