import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { PRIORITY_META } from '@shared/constants'
import type { Priority } from '@shared/types'

interface SegmentedProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string; icon?: ReactNode }>
  onChange: (value: T) => void
  className?: string
  /** 无可见标签时提供无障碍名称 */
  'aria-label'?: string
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  'aria-label': ariaLabel
}: SegmentedProps<T>) {
  return (
    // 单选分组用 radiogroup/radio 语义，屏幕阅读器才能读出「当前选中项」
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'no-drag inline-flex items-center gap-0.5 rounded-xl border border-line/10 bg-line/[0.06] p-0.5',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[12px] font-medium',
              'transition-all duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              active
                ? 'bg-gradient-to-br from-accent to-accent2 text-white shadow-[0_6px_18px_-10px_rgb(var(--accent-rgb)/0.95)]'
                : 'text-muted hover:bg-line/10 hover:text-ink'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'no-drag relative h-[22px] w-[40px] shrink-0 cursor-pointer rounded-pill border transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        checked ? 'border-transparent bg-gradient-to-br from-accent to-accent2' : 'border-line/15 bg-line/12',
        disabled && 'cursor-not-allowed opacity-45'
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]',
          'transition-all duration-200 ease-out',
          checked ? 'left-[21px]' : 'left-[3px]'
        )}
      />
    </button>
  )
}

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  display: string
  hint?: string
  disabled?: boolean
}

export function Slider({ value, min, max, step = 1, onChange, display, hint, disabled }: SliderProps) {
  // 已填充比例通过 CSS 变量传给轨道渐变，滑动时无需重排
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100
  const style = { '--fill': `${Math.min(100, Math.max(0, fill))}%` } as unknown as CSSProperties

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          style={style}
          onChange={(event) => onChange(Number(event.target.value))}
          className="no-drag flex-1"
        />
        <span className="w-14 shrink-0 text-right font-mono text-[12.5px] tabular-nums text-ink">{display}</span>
      </div>
      {hint ? <span className="text-[11.5px] leading-relaxed text-subtle">{hint}</span> : null}
    </div>
  )
}

export function PriorityDot({ priority, size = 7 }: { priority: Priority; size?: number }) {
  const meta = PRIORITY_META[priority]
  return (
    <span
      title={meta.label}
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: meta.color,
        boxShadow: priority === 'none' ? 'none' : `0 0 8px ${meta.color}99`
      }}
    />
  )
}

interface SettingRowProps {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}

export function SettingRow({ icon, title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line/8 bg-line/[0.04] px-3 py-2.5 transition-colors duration-150 hover:border-line/16 hover:bg-line/[0.07]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/14 text-accent">
          {icon}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[12.5px] font-medium text-ink">{title}</span>
          {description ? <span className="truncate text-[11px] text-subtle">{description}</span> : null}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
