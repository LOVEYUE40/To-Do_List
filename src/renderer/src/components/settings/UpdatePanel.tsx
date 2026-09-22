import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Power,
  RefreshCw,
  TriangleAlert
} from 'lucide-react'
import type { UpdateState } from '@shared/types'
import { RELEASE } from '@shared/constants'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { SettingRow, Switch } from '@/components/ui/Controls'
import { SectionCard } from '@/components/ui/SectionCard'
import { formatBytes } from '@/lib/format'
import { desktop } from '@/lib/desktop-api'
import { useSettingsStore } from '@/store/useSettingsStore'

type Tone = 'neutral' | 'info' | 'success' | 'accent' | 'danger'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-line/16 bg-line/[0.07] text-subtle',
  info: 'border-sky-500/35 bg-sky-500/[0.12] text-sky-300',
  success: 'border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-300',
  accent: 'border-accent/45 bg-accent/12 text-accent',
  danger: 'border-red-500/40 bg-red-500/12 text-red-400'
}

const STATE_META: Record<UpdateState, { label: string; tone: Tone }> = {
  idle: { label: '尚未检查', tone: 'neutral' },
  checking: { label: '正在检查', tone: 'info' },
  available: { label: '发现新版本', tone: 'accent' },
  'not-available': { label: '已是最新', tone: 'success' },
  downloading: { label: '正在下载', tone: 'accent' },
  downloaded: { label: '可以安装', tone: 'success' },
  error: { label: '检查失败', tone: 'danger' },
  unsupported: { label: '未启用', tone: 'neutral' }
}

export function UpdatePanel() {
  // 本面板只读取 autoUpdateCheck，收窄订阅避免外观滑块拖动连带重渲染
  const autoUpdateCheck = useSettingsStore((state) => state.settings.autoUpdateCheck)
  const patch = useSettingsStore((state) => state.patch)
  const status = useSettingsStore((state) => state.updateStatus)
  const setUpdateStatus = useSettingsStore((state) => state.setUpdateStatus)
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    let alive = true
    void desktop.update
      .status()
      .then((next) => {
        if (alive) setUpdateStatus(next)
      })
      .catch((err) => console.error('[update] 读取更新状态失败：', err))
    void desktop.app
      .version()
      .then((next) => {
        if (alive) setVersion(next)
      })
      .catch((err) => console.error('[update] 读取版本号失败：', err))
    return () => {
      alive = false
    }
  }, [setUpdateStatus])

  const meta = STATE_META[status.state]
  const canCheck = !busy && status.state !== 'checking' && status.state !== 'downloading'
  const canDownload = !busy && status.state === 'available'
  const canInstall = status.state === 'downloaded'

  const run = async (action: 'check' | 'download'): Promise<void> => {
    setBusy(true)
    try {
      const next = action === 'check' ? await desktop.update.check() : await desktop.update.download()
      setUpdateStatus(next)
    } catch (err) {
      console.error('[update] 更新操作失败：', err)
    } finally {
      // 必须放在 finally：否则一次异常会让按钮永久停留在禁用态
      setBusy(false)
    }
  }

  return (
    <SectionCard title="关于与更新" icon={<RefreshCw size={13} />}>
      <div className="mt-2 flex flex-col gap-2">
        <SettingRow
          icon={<Power size={12} />}
          title="当前版本"
          description={status.version ? `发现可用版本 v${status.version}` : '基于 GitHub Releases 分发'}
        >
          <span className="font-mono text-[11.5px] text-muted">{version ? `v${version}` : '读取中…'}</span>
        </SettingRow>

        <div className="flex flex-col gap-2 rounded-xl border border-line/10 bg-line/[0.04] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-subtle">更新状态</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-pill border px-2 py-[2px] text-[10.5px] font-medium',
                TONE_CLASS[meta.tone]
              )}
            >
              {status.state === 'checking' || status.state === 'downloading' ? (
                <Loader2 size={10} className="animate-spin" />
              ) : status.state === 'error' ? (
                <TriangleAlert size={10} />
              ) : (
                <CheckCircle2 size={10} />
              )}
              {meta.label}
            </span>
          </div>

          {status.message ? (
            <p className="text-[11.5px] leading-[1.6] text-muted">{status.message}</p>
          ) : null}

          {status.releaseNotes ? (
            <p className="scroll-thin max-h-[88px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-line/10 bg-line/[0.05] px-2 py-1.5 text-[11px] leading-[1.6] text-subtle">
              {status.releaseNotes}
            </p>
          ) : null}

          {status.state === 'downloading' ? (
            <div className="flex flex-col gap-1.5">
              <div className="h-[6px] w-full overflow-hidden rounded-pill bg-line/16">
                <div
                  className="h-full rounded-pill transition-[width] duration-300 ease-out"
                  style={{
                    width: `${status.percent ?? 0}%`,
                    background: 'linear-gradient(90deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))'
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10.5px] text-subtle">
                <span>{status.percent ?? 0}%</span>
                <span>
                  {formatBytes(status.transferred ?? 0)} / {formatBytes(status.total ?? 0)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {canInstall ? (
              <Button variant="primary" size="sm" onClick={() => desktop.update.install()}>
                重启并安装
              </Button>
            ) : canDownload ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Download size={12} />}
                disabled={!canDownload}
                onClick={() => void run('download')}
              >
                下载更新
              </Button>
            ) : (
              <Button
                variant="subtle"
                size="sm"
                icon={<RefreshCw size={12} />}
                disabled={!canCheck}
                onClick={() => void run('check')}
              >
                检查更新
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              icon={<ExternalLink size={12} />}
              onClick={() => void desktop.system.openExternal(RELEASE.releasesUrl)}
            >
              查看发布页
            </Button>
          </div>
        </div>

        <SettingRow icon={<RefreshCw size={12} />} title="自动检查更新" description="启动后静默检查，发现新版本时提示">
          <Switch
            checked={autoUpdateCheck}
            onChange={(value) => patch({ autoUpdateCheck: value })}
            label="自动检查更新"
          />
        </SettingRow>

        <p className="px-1 text-[10.5px] leading-[1.65] text-subtle">
          更新包通过 GitHub Releases 分发，未签名的安装包在安装时可能触发 Windows SmartScreen 提示，属正常现象。
          若仓库为私有，自动更新将无法拉取 Release 资源，需要将仓库设为公开。
        </p>
      </div>
    </SectionCard>
  )
}
