import { Notification } from 'electron'
import { IPC } from '@shared/constants'
import { store } from './store'
import { getMainWindow, sendWhenReady } from './windowManager'

const TICK_MS = 30_000
const BOOT_DELAY_MS = 4_000

let timer: ReturnType<typeof setInterval> | null = null
let bootTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 提醒调度放在主进程：渲染层计时器会被后台节流，
 * 且主进程可在启动/休眠恢复后补偿错过的提醒。
 */
function tick(): void {
  const data = store.get()
  const now = Date.now()
  const due = data.items.filter(
    (item) => !item.done && !item.notified && !!item.remindAt && item.remindAt <= now
  )
  if (due.length === 0) return

  const count = due.length
  const body = count === 1 ? due[0].title : `${due[0].title} 等 ${count} 项任务已到提醒时间`

  // 通知发送成功才标记已通知，失败时保留待触发状态，下一轮自动重试
  let sent = false
  try {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: count === 1 ? '待办提醒' : `${count} 项待办提醒`,
        body,
        urgency: 'critical'
      })
      notification.on('click', () => {
        const win = getMainWindow()
        if (win && !win.isDestroyed()) {
          win.show()
          win.focus()
        }
      })
      notification.show()
      sent = true
    } else {
      // 系统不支持通知：标记完成以避免每 30 秒无限重试
      console.warn('[reminders] 当前环境不支持系统通知，提醒仅标记不弹窗')
      sent = true
    }
  } catch (err) {
    console.error('[reminders] 系统通知发送失败，将在下轮重试：', err)
  }
  if (!sent) return

  for (const item of due) item.notified = true
  store.patch({ items: data.items })

  for (const item of due) {
    sendWhenReady(IPC.evtReminder, { id: item.id, title: item.title, firedAt: now })
  }
}

export function startReminderEngine(): void {
  if (timer) clearInterval(timer)
  timer = setInterval(tick, TICK_MS)
  // 启动后延迟补偿扫描，等渲染层就绪再推送
  if (bootTimer) clearTimeout(bootTimer)
  bootTimer = setTimeout(tick, BOOT_DELAY_MS)
}

export function stopReminderEngine(): void {
  if (timer) clearInterval(timer)
  if (bootTimer) clearTimeout(bootTimer)
  timer = null
  bootTimer = null
}

/** 数据变更后立即校验一次，让新设置的提醒更快生效 */
export function runReminderCheck(): void {
  tick()
}
