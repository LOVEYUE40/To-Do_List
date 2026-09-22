import { app, powerMonitor, session } from 'electron'
import { store } from './store'
import { applyAlwaysOnTop, captureBounds, createMainWindow, setQuitting, showMainWindow } from './windowManager'
import { registerIpcHandlers } from './ipc'
import { startReminderEngine, stopReminderEngine } from './reminders'
import { createTray, destroyTray } from './tray'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { initUpdater, disposeUpdater } from './updater'

/**
 * 内容安全策略。
 *
 * style-src 必须保留 'unsafe-inline'：渲染层大量使用 React 内联 style（滑块、渐变、
 * 外壳背景），recharts 也依赖 style 属性，去掉会让整个界面样式失效。
 * 页面内没有内联 <script>，所以 script-src 可以收紧到 'self'。
 */
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')

/**
 * 仅在打包环境注入 CSP。
 * 开发期不能注入：Vite 会注入内联模块前导码并使用 HMR websocket，
 * 严格的 script-src / connect-src 会直接把 npm run dev 弄坏。
 */
function applyContentSecurityPolicy(): void {
  if (!app.isPackaged) return
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP_POLICY]
      }
    })
  })
}

// 单实例：再次启动时聚焦已有窗口，避免多份托盘图标与数据竞争
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  // 启动期设置需要在 ready 之前同步读取
  const initialData = store.initSync()
  if (initialData.settings.disableHardwareAcceleration) {
    app.disableHardwareAcceleration()
  }

  // 背景闪烁修复：小组件常驻置顶、经常被遮挡或隐藏到托盘，
  // 后台节流会在窗口恢复时引发集中重绘，表现为玻璃背景短时间内的闪烁/跳动。
  // 必须在 app ready 前追加才生效。
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  app.commandLine.appendSwitch('disable-background-timer-throttling')

  app.on('second-instance', () => {
    showMainWindow()
  })

  app
    .whenReady()
    .then(() => {
      app.setAppUserModelId('com.todowidget.app')

      // 必须在创建窗口之前挂上，确保首个页面响应就带上 CSP
      applyContentSecurityPolicy()

      registerIpcHandlers()

      const settings = store.getSettings()
      createMainWindow(settings)
      applyAlwaysOnTop(settings.alwaysOnTop)

      createTray(settings)
      registerShortcuts(settings.shortcuts)
      startReminderEngine()
      // 自动更新：内部含 isPackaged 守卫，开发环境只记录状态不发起网络请求
      initUpdater(settings)

      try {
        app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin })
      } catch (err) {
        console.error('[main] 初始化开机自启失败：', err)
      }

      // Windows 关机/注销时 before-quit 不可靠，必须监听 powerMonitor 兜底落盘
      powerMonitor.on('shutdown', () => {
        setQuitting(true)
        store.flushSync()
        app.quit()
      })

      console.info('[main] 待办小组件已启动，数据文件：', store.summary().path)
    })
    .catch((err) => {
      console.error('[main] 启动流程失败：', err)
    })

  // 常驻托盘应用：窗口全部隐藏/关闭时不退出
  app.on('window-all-closed', () => {
    console.info('[main] 窗口已全部关闭，继续在托盘驻留')
  })

  app.on('activate', () => {
    showMainWindow()
  })

  app.on('before-quit', () => {
    setQuitting(true)
    const bounds = captureBounds(store.getSettings().bounds)
    if (bounds) store.setSettings({ bounds })
    store.flushSync()
  })

  app.on('will-quit', () => {
    stopReminderEngine()
    unregisterShortcuts()
    disposeUpdater()
    destroyTray()
  })
}

// 进程兜底：未捕获异常时先原子落盘再退出，避免带着未保存数据静默死亡或进入未定义状态
process.on('uncaughtException', (err) => {
  console.error('[main] 未捕获异常：', err)
  try {
    store.flushSync()
  } catch (flushErr) {
    console.error('[main] 异常退出前落盘失败：', flushErr)
  }
  app.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('[main] 未处理的 Promise 拒绝：', reason)
})
