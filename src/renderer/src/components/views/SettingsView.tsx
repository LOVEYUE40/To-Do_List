import { BookOpen, Droplets, Eye, Moon, Sparkles, Sun, SunMoon } from 'lucide-react'
import type { ColorScheme, ThemeId } from '@shared/types'
import { DEFAULT_SETTINGS, THEME_PRESETS } from '@shared/constants'
import { Button } from '@/components/ui/Button'
import { Segmented, SettingRow, Slider, Switch } from '@/components/ui/Controls'
import { SectionCard } from '@/components/ui/SectionCard'
import { ThemeGallery } from '@/components/settings/ThemeGallery'
import { SystemPanel } from '@/components/settings/SystemPanel'
import { UpdatePanel } from '@/components/settings/UpdatePanel'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTodoStore } from '@/store/useTodoStore'

const SCHEME_OPTIONS: Array<{ value: ColorScheme; label: string }> = [
  { value: 'dark', label: '深色' },
  { value: 'light', label: '浅色' },
  { value: 'system', label: '跟随系统' }
]

export function SettingsView() {
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)
  const openGuide = useSettingsStore((state) => state.openGuide)
  const setUi = useTodoStore((state) => state.setUi)

  const handleThemeSelect = (theme: ThemeId, accent?: string): void => {
    patch(theme === 'custom' && accent ? { theme, customAccent: accent } : { theme })
  }

  const presetName = THEME_PRESETS.find((preset) => preset.id === settings.theme)?.name ?? '自定义配色'

  return (
    <section className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 pt-3">
      <SectionCard title="使用引导" icon={<BookOpen size={13} />}>
        <p className="mt-1.5 text-[11px] leading-[1.65] text-subtle">
          第一次使用建议先看一遍五步引导；忘记某个操作时，帮助中心里有完整的功能说明与快捷键速查。
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="subtle" size="sm" icon={<Sparkles size={12} />} onClick={openGuide}>
            重新查看新手引导
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<BookOpen size={12} />}
            onClick={() => setUi({ view: 'help' })}
          >
            打开帮助中心
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="配色方案"
        icon={<Sparkles size={13} />}
        extra={
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] text-subtle">{presetName}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                patch({
                  theme: DEFAULT_SETTINGS.theme,
                  customAccent: DEFAULT_SETTINGS.customAccent
                })
              }
            >
              重置
            </Button>
          </div>
        }
      >
        <div className="mt-2">
          <ThemeGallery theme={settings.theme} customAccent={settings.customAccent} onSelect={handleThemeSelect} />
        </div>
      </SectionCard>

      <SectionCard title="透明度与毛玻璃" icon={<Droplets size={13} />}>
        <div className="mt-2.5 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink">整体不透明度</span>
            <Slider
              value={Math.round(settings.opacity * 100)}
              min={30}
              max={100}
              onChange={(value) => patch({ opacity: value / 100 })}
              display={`${Math.round(settings.opacity * 100)}%`}
              hint="控制整个窗口（含文字）的透明程度，数值越低越能透出桌面内容；若希望窗口完全不透明，请同时将玻璃底色浓度调至 100%。"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink">玻璃底色浓度</span>
            <Slider
              value={Math.round(settings.glassAlpha * 100)}
              min={0}
              max={100}
              onChange={(value) => patch({ glassAlpha: value / 100 })}
              display={`${Math.round(settings.glassAlpha * 100)}%`}
              hint="决定面板自身的底色厚度，调低会显得更通透；调至 100% 后窗口完全实心，不再透出桌面。"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink">毛玻璃模糊</span>
            <Slider
              value={settings.blur}
              min={0}
              max={28}
              onChange={(value) => patch({ blur: value })}
              display={`${settings.blur}px`}
              hint="模糊强度越高，玻璃质感越明显，同时对显卡的开销也略高。"
            />
          </div>

          <SettingRow icon={<Eye size={12} />} title="低透明度可读性增强" description="不透明度低于 50% 时自动加深底色与描边">
            <Switch
              checked={settings.hardenReadability}
              onChange={(value) => patch({ hardenReadability: value })}
              label="低透明度可读性增强"
            />
          </SettingRow>
        </div>
      </SectionCard>

      <SectionCard title="明暗外观" icon={<SunMoon size={13} />}>
        <div className="mt-2 flex flex-col gap-2">
          <Segmented
            aria-label="明暗外观"
            value={settings.colorScheme}
            options={SCHEME_OPTIONS.map((option) => ({
              ...option,
              icon:
                option.value === 'dark' ? <Moon size={11} /> : option.value === 'light' ? <Sun size={11} /> : undefined
            }))}
            onChange={(scheme) => patch({ colorScheme: scheme })}
            className="w-full"
          />

          <p className="text-[10.5px] leading-relaxed text-subtle">
            深色适合夜间与深色壁纸，浅色在明亮桌面下对比更自然；跟随系统时会随系统主题实时切换。
          </p>
        </div>
      </SectionCard>

      <SystemPanel />

      <UpdatePanel />
    </section>
  )
}
