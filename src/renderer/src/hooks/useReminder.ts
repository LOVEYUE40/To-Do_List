import { useEffect } from 'react'
import { useTodoStore } from '@/store/useTodoStore'

/**
 * 订阅主进程的提醒事件：
 * 主进程负责真正的定时与系统通知，渲染层只同步 notified 标记并给出轻提示。
 * 注意必须同步 notified，否则下次本地落盘会把标记写回 false 导致重复提醒。
 */
export function useReminder(): void {
  const markNotified = useTodoStore((state) => state.markNotified)
  const setToast = useTodoStore((state) => state.setToast)

  useEffect(() => {
    const off = window.desktop?.on('reminder', (payload) => {
      const data = payload as { id?: string; title?: string } | undefined
      if (!data) return
      if (data.id) markNotified(data.id)
      if (data.title) setToast(`提醒：${data.title}`)
    })
    return () => {
      if (off) off()
    }
  }, [markNotified, setToast])
}
