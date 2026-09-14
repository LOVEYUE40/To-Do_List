import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Download,
  FolderOpen,
  FolderSymlink,
  HardDrive,
  Info,
  Keyboard,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload
} from 'lucide-react'
import type { DataSummary } from '@shared/types'
import { formatRelative } from '@shared/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SettingRow } from '@/components/ui/Controls'
import { formatBytes, formatShortcut } from '@/lib/format'
import { desktop } from '@/lib/desktop-api'
import { useTodoStore } from '@/store/useTodoStore'
import { useSettingsStore } from '@/store/useSettingsStore'

export function DataView() {
  const hydrate = useTodoStore((state) => state.hydrate)
  const setToast = useTodoStore((state) => state.setToast)
  const exportDir = useSettingsStore((state) => state.settings.exportDir)
  const shortcuts = useSettingsStore((state) => state.settings.shortcuts)
  const patchSettings = useSettingsStore((state) => state.patch)

  const [summary, setSummary] = useState<DataSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [version, setVersion] = useState('1.0.0')

  const refresh = useCallback(async () => {
    try {
      const data = await desktop.data.summary()
      setSummary(data)
    } catch (err) {
      console.error('[data] 读取数据概览失败：', err)
    }
  }, [])

  useEffect(() => {
    void refresh()
    void desktop.app.version().then(setVersion)
  }, [refresh])

  const handleExport = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await desktop.data.exportFile()
      setToast(result.canceled ? '已取消导出' : `数据已导出到 ${result.path ?? '未知位置'}`)
    } catch (err) {
      console.error('[data] 导出失败：', err)
      setToast('导出失败，请查看日志')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await desktop.data.importFile()
      if (result.canceled) {
        setToast('已取消导入')
        return
      }
      if (result.error) {
        setToast(`导入失败：${result.error}`)
        return
      }
      if (result.data) {
        hydrate(result.data)
        await refresh()
        setToast(`已从 ${result.fileName} 导入 ${result.counts?.items ?? 0} 项任务`)
      }
    } catch (err) {
      console.error('[data] 导入失败：', err)
      setToast('导入失败，请查看日志')
    } finally {
      setBusy(false)
    }
  }

  const handleClear = async (): Promise<void> => {
    setBusy(true)
    try {
      const data = await desktop.data.clearAll()
      hydrate(data)
      await refresh()
      setConfirmClear(false)
      setToast('已清空全部任务，原数据已自动备份')
    } catch (err) {
      console.error('[data] 清空失败：', err)
      setToast('清空失败，请查看日志')
    } finally {
      setBusy(false)
    }
  }

  const handlePickExportDir = async (): Promise<void> => {
    const dir = await desktop.dialog.pickDirectory()
    if (!dir) return
    patchSettings({ exportDir: dir })
    setToast(`导出位置已设置为 ${dir}`)
  }

  const handleResetExportDir = (): void => {
    patchSettings({ exportDir: '' })
    setToast('已恢复为系统默认导出位置')
  }

  return (
    <section className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 pt-3">
      <div className="glass-card rounded-card p-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <HardDrive size={13} className="text-accent" /> 本地数据概览
          </h3>
          <Button size="sm" variant="ghost" icon={<RefreshCw size={12} />} onClick={() => void refresh()} disabled={busy}>
            刷新
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          <div className="rounded-xl border border-line/8 bg-line/[0.04] px-3 py-2">
            <span className="text-[10.5px] text-subtle">数据文件路径</span>
            <p className="mt-0.5 break-all font-mono text-[11px] leading-relaxed text-ink">
              {summary?.path ?? '读取中…'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-xl border border-line/8 bg-line/[0.04] px-3 py-2">
              <span className="text-[10.5px] text-subtle">清单</span>
              <p className="font-mono text-[15px] font-semibold text-ink">{summary?.listCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-line/8 bg-line/[0.04] px-3 py-2">
              <span className="text-[10.5px] text-subtle">任务</span>
              <p className="font-mono text-[15px] font-semibold text-ink">{summary?.itemCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-line/8 bg-line/[0.04] px-3 py-2">
              <span className="text-[10.5px] text-subtle">已完成</span>
              <p className="font-mono text-[15px] font-semibold text-ink">{summary?.doneCount ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-[10.5px] text-subtle">
            <span>文件大小 {formatBytes(summary?.bytes ?? 0)}</span>
            <span>上次保存 {formatRelative(summary?.updatedAt)}</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            icon={<FolderOpen size={12} />}
            onClick={() =>
              void desktop.data
                .openFolder()
                .then((ok) => setToast(ok ? '已在文件管理器中打开数据目录' : '无法打开数据目录'))
            }
          >
            打开数据目录
          </Button>

          <div className="rounded-xl border border-line/8 bg-line/[0.04] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10.5px] text-subtle">
                <FolderSymlink size={11} /> 导出保存位置
              </span>
              <span className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => void handlePickExportDir()}>
                  更改
                </Button>
                {exportDir ? (
                  <Button size="sm" variant="ghost" icon={<RotateCcw size={11} />} onClick={handleResetExportDir}>
                    恢复默认
                  </Button>
                ) : null}
              </span>
            </div>
            <p className="mt-0.5 break-all font-mono text-[11px] leading-relaxed text-ink">
              {exportDir || '系统默认（每次导出时手动选择）'}
            </p>
            <p className="mt-0.5 text-[10.5px] text-subtle">设置后，导出对话框将默认定位到该目录</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExport()}
          className="glass-card flex cursor-pointer items-center gap-3 rounded-card px-3 py-3 text-left transition-all duration-150 hover:-translate-y-[2px] hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/16 text-accent">
            <Download size={16} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12.5px] font-medium text-ink">导出为 JSON 文件</span>
            <span className="text-[11px] text-subtle">包含全部清单、任务与外观设置，可用于迁移或备份</span>
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleImport()}
          className="glass-card flex cursor-pointer items-center gap-3 rounded-card px-3 py-3 text-left transition-all duration-150 hover:-translate-y-[2px] hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent2/16 text-accent2">
            <Upload size={16} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12.5px] font-medium text-ink">导入 JSON 文件</span>
            <span className="text-[11px] text-subtle">导入前会做结构校验，并自动备份当前数据</span>
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmClear(true)}
          className="flex cursor-pointer items-center gap-3 rounded-card border border-red-500/35 bg-red-500/[0.07] px-3 py-3 text-left transition-all duration-150 hover:-translate-y-[2px] hover:border-red-500/60 hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/16 text-red-400">
            <Trash2 size={16} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12.5px] font-medium text-red-400">清空全部数据</span>
            <span className="text-[11px] text-subtle">保留清单与外观设置，删除全部任务并自动生成备份</span>
          </span>
        </button>
      </div>

      <div className="glass-card rounded-card p-3">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <Info size={13} className="text-accent" /> 关于与快捷键速查
        </h3>

        <div className="mt-2 flex flex-col gap-1.5">
          <SettingRow icon={<Info size={12} />} title="应用版本" description="Electron 桌面端">
            <span className="font-mono text-[11.5px] text-muted">v{version}</span>
          </SettingRow>
          <SettingRow icon={<Keyboard size={12} />} title="显示 / 隐藏窗口" description="可在设置页自定义">
            <span className="font-mono text-[11.5px] text-muted">{formatShortcut(shortcuts.toggle)}</span>
          </SettingRow>
          <SettingRow icon={<Keyboard size={12} />} title="快速新增任务" description="任意界面可用">
            <span className="font-mono text-[11.5px] text-muted">{formatShortcut(shortcuts.quickAdd)}</span>
          </SettingRow>
        </div>

        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-line/8 bg-line/[0.03] px-3 py-2">
          <AlertTriangle size={12} className="mt-[3px] shrink-0 text-amber-400" />
          <p className="text-[11px] leading-relaxed text-subtle">
            数据默认保存在系统用户目录下的 <span className="font-mono">todo-data.json</span>，
            采用「临时文件 + 重命名」的原子写入方式；导入与清空前会自动生成备份，最多保留 5 份历史备份。
          </p>
        </div>
      </div>

      <Modal
        open={confirmClear}
        title="确认清空全部任务？"
        description="该操作不可撤销，但会先生成一份备份文件"
        onClose={() => setConfirmClear(false)}
        width={360}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void handleClear()} disabled={busy}>
              确认清空
            </Button>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-muted">
          将删除当前 {summary?.itemCount ?? 0} 项任务，保留清单结构与全部外观设置。
          如需完整回滚，可在清空后重新导入刚才的备份文件。
        </p>
      </Modal>
    </section>
  )
}
