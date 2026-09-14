import { globalShortcut } from 'electron'
import { IPC } from '@shared/constants'
import type { ShortcutSettings } from '@shared/types'
import { sendWhenReady, showMainWindow, toggleMainWindow } from './windowManager'

export interface ShortcutBindResult {
  ok: boolean
  failed: string[]
}

/**
 * 全局快捷键统一在此注册；注册失败不阻断启动，
 * 只记录日志并回传失败的组合键供设置页提示。
 */
export function registerShortcuts(shortcuts: ShortcutSettings): ShortcutBindResult {
  globalShortcut.unregisterAll()
  const failed: string[] = []

  const bind = (accelerator: string, handler: () => void): void => {
    if (!accelerator) return
    try {
      const ok = globalShortcut.register(accelerator, handler)
      if (!ok) failed.push(accelerator)
    } catch (err) {
      console.error('[shortcuts] 注册失败：', accelerator, err)
      failed.push(accelerator)
    }
  }

  bind(shortcuts.toggle, () => toggleMainWindow())
  bind(shortcuts.quickAdd, () => {
    showMainWindow()
    sendWhenReady(IPC.evtQuickAdd)
  })

  if (failed.length > 0) {
    console.error('[shortcuts] 以下快捷键被系统或其他应用占用：', failed.join(', '))
  }

  return { ok: failed.length === 0, failed }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
