import { Check, Palette } from 'lucide-react'
import { THEME_PRESETS } from '@shared/constants'
import type { ThemeId } from '@shared/types'
import { cn } from '@/lib/cn'

interface ThemeGalleryProps {
  theme: ThemeId
  customAccent: string
  onSelect: (theme: ThemeId, accent?: string) => void
}

export function ThemeGallery({ theme, customAccent, onSelect }: ThemeGalleryProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {THEME_PRESETS.map((preset) => {
          const active = theme === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id as ThemeId, preset.accent)}
              className={cn(
                'no-drag group relative flex cursor-pointer flex-col gap-1.5 rounded-card border p-1.5 text-left',
                'transition-all duration-150 ease-out hover:-translate-y-[2px]',
                active ? 'border-accent/60 animate-breathe' : 'border-line/10 hover:border-line/25'
              )}
            >
              <span
                className="relative h-11 w-full overflow-hidden rounded-[11px]"
                style={{
                  background: `linear-gradient(140deg, ${preset.accent}, ${preset.accent2} 55%, ${preset.glow})`
                }}
              >
                <span className="absolute inset-x-1.5 bottom-1.5 h-3 rounded-[6px] bg-black/25 backdrop-blur-sm" />
                {active ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-[10px] text-black">
                    <Check size={10} strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span className={cn('truncate px-0.5 text-[11px] font-medium', active ? 'text-ink' : 'text-muted')}>
                {preset.name}
              </span>
            </button>
          )
        })}
      </div>

      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors duration-150',
          theme === 'custom' ? 'border-accent/50 bg-accent/8' : 'border-line/10 bg-line/[0.04]'
        )}
      >
        <Palette size={13} className="shrink-0 text-accent" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12px] font-medium text-ink">自定义强调色</span>
          <span className="text-[10.5px] text-subtle">选择任意颜色，自动派生渐变与光晕</span>
        </div>
        <input
          type="color"
          value={customAccent}
          onChange={(event) => onSelect('custom', event.target.value)}
          className="no-drag h-7 w-10 cursor-pointer rounded-lg border border-line/15 bg-transparent p-0.5"
        />
        <span className="w-[68px] shrink-0 text-right font-mono text-[11px] uppercase text-muted">{customAccent}</span>
      </div>
    </div>
  )
}
