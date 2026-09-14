import { Check, Pin, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

export type IllustrationVariant = 'welcome' | 'tasks' | 'organize' | 'appearance' | 'window'

/**
 * 引导插画：全部用 CSS 变量与内联元素绘制，不引入二进制图片。
 * 好处是切换主题色板 / 明暗外观时插画会自动跟随，且不会增加安装包体积。
 */
function Scene({ variant }: { variant: IllustrationVariant }) {
  if (variant === 'welcome') {
    return (
      <div className="flex items-center gap-3">
        <div
          className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] text-white"
          style={{
            background: 'linear-gradient(140deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))',
            boxShadow: '0 12px 30px -12px rgb(var(--accent-rgb) / 0.95)'
          }}
        >
          <Sparkles size={22} />
        </div>
        <div className="flex h-[62px] w-[132px] flex-col justify-center gap-[7px] rounded-[14px] border border-line/15 bg-line/[0.07] px-3 backdrop-blur-sm">
          <span className="h-[6px] w-[74px] rounded-pill bg-line/25" />
          <span className="h-[6px] w-[52px] rounded-pill bg-line/18" />
          <span className="h-[6px] w-[64px] rounded-pill bg-line/12" />
        </div>
      </div>
    )
  }

  if (variant === 'tasks') {
    return (
      <div className="flex w-[196px] flex-col gap-[6px]">
        {[true, false, false].map((checked, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-[10px] border border-line/12 bg-line/[0.06] px-2 py-[6px] backdrop-blur-sm"
          >
            <span
              className={cn(
                'flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-[4px] border',
                checked ? 'border-transparent text-white' : 'border-line/35'
              )}
              style={
                checked
                  ? { background: 'linear-gradient(140deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))' }
                  : undefined
              }
            >
              {checked ? <Check size={9} strokeWidth={3} /> : null}
            </span>
            <span
              className={cn('h-[6px] rounded-pill', checked ? 'bg-line/18' : 'bg-line/26')}
              style={{ width: 96 - index * 18 }}
            />
            <span
              className="ml-auto h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ backgroundColor: index === 1 ? 'rgb(var(--accent-rgb) / 0.85)' : 'rgb(var(--line-rgb) / 0.3)' }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'organize') {
    return (
      <div className="flex items-end gap-[10px]">
        {[
          { h: 34, tone: 'rgb(var(--accent-rgb) / 0.9)' },
          { h: 52, tone: 'rgb(var(--accent-2-rgb) / 0.8)' },
          { h: 44, tone: 'rgb(var(--glow-rgb) / 0.75)' },
          { h: 26, tone: 'rgb(var(--line-rgb) / 0.22)' }
        ].map((bar, index) => (
          <div key={index} className="flex flex-col items-center gap-[6px]">
            <span
              className="w-[26px] rounded-[8px]"
              style={{ height: bar.h, backgroundColor: bar.tone }}
            />
            <span className="h-[5px] w-[18px] rounded-pill bg-line/18" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'appearance') {
    return (
      <div className="relative flex w-[196px] flex-col items-center gap-4">
        <div className="relative h-[52px] w-full">
          {[
            { left: 34, tone: 'rgb(var(--accent-rgb) / 0.75)' },
            { left: 76, tone: 'rgb(var(--accent-2-rgb) / 0.7)' },
            { left: 118, tone: 'rgb(var(--glow-rgb) / 0.65)' }
          ].map((dot) => (
            <span
              key={dot.left}
              className="absolute top-[6px] h-[40px] w-[40px] rounded-full backdrop-blur-sm"
              style={{ left: dot.left, backgroundColor: dot.tone }}
            />
          ))}
        </div>
        <div className="flex w-full items-center gap-2">
          <span className="h-[6px] flex-1 overflow-hidden rounded-pill bg-line/16">
            <span
              className="block h-full w-[62%] rounded-pill"
              style={{ background: 'linear-gradient(90deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))' }}
            />
          </span>
          <span className="h-[12px] w-[12px] rounded-full border border-white/70 bg-white/90" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-[74px] w-[152px] flex-col overflow-hidden rounded-[14px] border border-line/15 bg-line/[0.06] backdrop-blur-sm">
        <div className="flex h-[18px] items-center gap-[5px] border-b border-line/12 px-2">
          <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: 'rgb(var(--accent-rgb))' }} />
          <span className="h-[5px] w-[5px] rounded-full bg-line/30" />
          <span className="h-[5px] w-[5px] rounded-full bg-line/20" />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-[7px] px-3">
          <span className="h-[6px] w-[92px] rounded-pill bg-line/25" />
          <span className="h-[6px] w-[62px] rounded-pill bg-line/16" />
        </div>
      </div>
      <span
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-white"
        style={{
          background: 'linear-gradient(140deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))',
          boxShadow: '0 10px 24px -12px rgb(var(--accent-rgb) / 0.95)'
        }}
      >
        <Pin size={15} />
      </span>
    </div>
  )
}

export function GuideIllustration({
  variant,
  className
}: {
  variant: IllustrationVariant
  className?: string
}) {
  return (
    <div
      className={cn('relative h-[112px] w-full overflow-hidden rounded-[16px]', className)}
      style={{
        background:
          'linear-gradient(140deg, rgb(var(--accent-rgb) / 0.2), rgb(var(--accent-2-rgb) / 0.08) 58%, rgb(var(--surface-rgb) / 0.05))'
      }}
    >
      <span
        className="pointer-events-none absolute -left-7 -top-9 h-[110px] w-[110px] rounded-full blur-[38px]"
        style={{ backgroundColor: 'rgb(var(--accent-rgb) / 0.42)' }}
      />
      <span
        className="pointer-events-none absolute -bottom-10 -right-6 h-[110px] w-[110px] rounded-full blur-[38px]"
        style={{ backgroundColor: 'rgb(var(--accent-2-rgb) / 0.3)' }}
      />
      <div className="relative flex h-full items-center justify-center">
        <Scene variant={variant} />
      </div>
    </div>
  )
}
