import { useEffect, useState } from 'react'

/** 量化到当前分钟起始，避免 30s tick 内值频繁变化导致下游 memo 全部失效 */
function startOfMinute(ts: number): number {
  const d = new Date(ts)
  d.setSeconds(0, 0)
  return d.getTime()
}

/** 周期性刷新的当前时间（分钟粒度），用于「已逾期 / 今天到期」等状态自动更新 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => startOfMinute(Date.now()))
  useEffect(() => {
    const timer = setInterval(() => {
      const minute = startOfMinute(Date.now())
      setNow((prev) => (prev === minute ? prev : minute))
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
