import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Monitor } from 'lucide-react'
import type { AppInfo } from '@shared/types'
import { SUPPORT_SCOPE } from '@shared/constants'
import { cn } from '@/lib/cn'
import { desktop } from '@/lib/desktop-api'

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-[7px]">
      <span className="shrink-0 text-[12px] text-subtle">{label}</span>
      <span
        className={cn('min-w-0 break-all text-right text-[12px] text-ink', mono && 'font-mono text-[11.5px]')}
      >
        {value}
      </span>
    </div>
  )
}

/** 系统要求与兼容性：实时读取主进程的运行环境判定，口径与 README 完全一致 */
export function HelpSystemCard() {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void desktop.app.info().then(setInfo)
  }, [])

  const supported = info?.supported ?? true

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          'flex items-start gap-2 rounded-xl border px-3 py-2.5',
          supported
            ? 'border-emerald-500/35 bg-emerald-500/[0.09]'
            : 'border-amber-500/40 bg-amber-500/[0.1]'
        )}
      >
        <span className={cn('mt-[1px] shrink-0', supported ? 'text-emerald-400' : 'text-amber-400')}>
          {supported ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className={cn('text-[12.5px] font-medium', supported ? 'text-emerald-300' : 'text-amber-300')}>
            {supported ? '当前系统受支持' : '当前系统不受支持'}
          </span>
          <span className="text-[11.5px] leading-[1.6] text-muted">
            {supported
              ? '你的系统落在本应用的支持范围内，全部功能可正常使用。'
              : info?.supportHint || '系统版本低于最低要求。'}
          </span>
        </div>
      </div>

      <div className="divide-y divide-line/8 rounded-xl border border-line/10 bg-line/[0.04] px-3">
        <Row label="当前系统" value={info ? `${info.osVersion} · ${info.arch}` : '读取中…'} />
        <Row label="内核版本" value={info?.osRelease ?? '读取中…'} mono />
        <Row label="支持范围" value={SUPPORT_SCOPE.title} />
        <Row label="应用版本" value={info ? `v${info.version}` : '读取中…'} mono />
        <Row
          label="运行环境"
          value={info ? `Electron ${info.electron} · Chromium ${info.chrome}` : '读取中…'}
          mono
        />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-line/10 bg-line/[0.04] px-3 py-2.5">
        <Monitor size={13} className="mt-[2px] shrink-0 text-accent" />
        <p className="text-[11.5px] leading-[1.65] text-subtle">{SUPPORT_SCOPE.detail}</p>
      </div>
    </div>
  )
}
