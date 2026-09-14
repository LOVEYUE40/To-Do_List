import { Keyboard, Monitor, PanelTop, Pin, Power, Rocket, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Segmented, SettingRow, Switch } from '@/components/ui/Controls'
import { desktop } from '@/lib/desktop-api'
import { useSettingsStore } from '@/store/useSettingsStore'
import { ShortcutRecorder } from './ShortcutRecorder'

export function SystemPanel() {
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)
  const setWindowMode = useSettingsStore((state) => state.setWindowMode)

  const isWidget = settings.windowMode === 'widget'

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-card rounded-card p-3">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <PanelTop size={13} className="text-accent" /> 窗口形态
        </h3>

        <div className="mt-2 flex flex-col gap-2">
          <Segmented
            value={settings.windowMode}
            options={[
              { value: 'widget', label: '桌面小组件' },
              { value: 'window', label: '普通窗口' }
            ]}
            onChange={(mode) => setWindowMode(mode as 'widget' | 'window')}
            className="w-full"
          />

          <p className="text-[10.5px] leading-relaxed text-subtle">
            小组件模式为无边框、透明、置顶的便签形态；普通窗口模式带系统标题栏。
            切换时会重建窗口，因此会有一瞬间的重新加载，但数据与视图状态都会保留。
          </p>

          <SettingRow icon={<Pin size={12} />} title="始终置顶" description="窗口保持在其他应用之上">
            <Switch checked={settings.alwaysOnTop} onChange={(value) => patch({ alwaysOnTop: value })} label="始终置顶" />
          </SettingRow>

          <SettingRow icon={<Power size={12} />} title="关闭按钮行为" description="当前为隐藏到系统托盘">
            <Button size="sm" variant="ghost" onClick={() => desktop.window.hide()}>
              隐藏窗口
            </Button>
          </SettingRow>
        </div>
      </div>

      <div className="glass-card rounded-card p-3">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <Monitor size={13} className="text-accent" /> 系统集成
        </h3>

        <div className="mt-2 flex flex-col gap-2">
          <SettingRow icon={<Rocket size={12} />} title="开机自动启动" description="登录系统后自动运行待办小组件">
            <Switch
              checked={settings.launchAtLogin}
              onChange={(value) => void desktop.system.setLaunchAtLogin(value).then(() => patch({ launchAtLogin: value }))}
              label="开机自动启动"
            />
          </SettingRow>

          <SettingRow icon={<TriangleAlert size={12} />} title="禁用硬件加速" description="透明窗口出现黑底时的兜底方案，需重启生效">
            <Switch
              checked={settings.disableHardwareAcceleration}
              onChange={(value) => patch({ disableHardwareAcceleration: value })}
              label="禁用硬件加速"
            />
          </SettingRow>
        </div>
      </div>

      <div className="glass-card rounded-card p-3">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <Keyboard size={13} className="text-accent" /> 全局快捷键
        </h3>

        <div className="mt-2 flex flex-col gap-2">
          <SettingRow icon={<Keyboard size={12} />} title="显示 / 隐藏窗口" description="系统任意位置可用">
            <ShortcutRecorder
              value={settings.shortcuts.toggle}
              onChange={(accelerator) => patch({ shortcuts: { ...settings.shortcuts, toggle: accelerator } })}
            />
          </SettingRow>

          <SettingRow icon={<Keyboard size={12} />} title="快速新增任务" description="唤起窗口并聚焦输入框">
            <ShortcutRecorder
              value={settings.shortcuts.quickAdd}
              onChange={(accelerator) => patch({ shortcuts: { ...settings.shortcuts, quickAdd: accelerator } })}
            />
          </SettingRow>
        </div>

        <p className="mt-2 text-[10.5px] leading-relaxed text-subtle">
          点击快捷键按钮后按下新的组合键即可替换，按 Esc 取消录制。
          若组合键被系统或其他应用占用，注册会失败并在主进程日志中记录，建议改用 Ctrl + Alt 组合。
        </p>
      </div>

      <div className="flex items-center justify-between rounded-card border border-line/10 bg-line/[0.04] px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-ink">退出应用</span>
          <span className="text-[10.5px] text-subtle">退出后将不再接收任务提醒</span>
        </div>
        <Button size="sm" variant="danger" onClick={() => desktop.window.quit()}>
          退出
        </Button>
      </div>
    </div>
  )
}
