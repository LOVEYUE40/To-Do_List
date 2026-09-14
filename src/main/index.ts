import { app, powerMonitor } from 'electron'
import { store } from './store'
import { applyAlwaysOnTop, captureBounds, createMainWindow, setQuitting, showMainWindow } from './windowManager'
import { registerIpcHandlers } from './ipc'
import { startReminderEngine, stopReminderEngine } from './reminders'
import { createTray, destroyTray } from './tray'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { initUpdater } from './updater'

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

  app.on('second-instance', () => {
    showMainWindow()
  })

  app
    .whenReady()
    .then(() => {
      app.setAppUserModelId('com.todowidget.app')

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
