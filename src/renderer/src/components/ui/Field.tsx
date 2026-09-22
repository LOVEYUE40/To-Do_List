import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
}

export function Input({ icon, className, ...rest }: InputProps) {
  if (icon) {
    return (
      <div className="no-drag relative flex items-center">
        <span className="pointer-events-none absolute left-2.5 flex h-4 w-4 items-center justify-center text-subtle">
          {icon}
        </span>
        <input className={cn('field-input pl-8', className)} {...rest} />
      </div>
    )
  }
  return <input className={cn('field-input', className)} {...rest} />
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('field-input resize-none leading-relaxed', className)} {...rest} />
}

interface FieldProps {
  label: string
  hint?: string
  /**
   * 显式绑定到子控件：不传时 Field 只做视觉分组。
   * 传入控件的 id 后会渲染成 <label htmlFor>，屏幕阅读器与点击标签聚焦才成立。
   */
  htmlFor?: string
  children: ReactNode
}

export function Field({ label, hint, htmlFor, children }: FieldProps) {
  const fallbackId = useId()
  const labelId = `${htmlFor ?? fallbackId}-label`
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="cursor-pointer text-[12.5px] font-medium text-ink">
            {label}
          </label>
        ) : (
          <span id={labelId} className="text-[12.5px] font-medium text-ink">
            {label}
          </span>
        )}
        {hint ? <span className="text-[11.5px] text-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

interface SelectProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
  id?: string
  /** 无可见标签时提供无障碍名称 */
  'aria-label'?: string
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  className,
  id,
  'aria-label': ariaLabel
}: SelectProps<T>) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={cn(
        'no-drag h-8 cursor-pointer rounded-lg border border-line/12 bg-surface/60 px-2 text-[12.5px] text-ink',
        'outline-none transition-colors duration-150 hover:border-line/25 focus:border-accent/60',
        className
      )}
    >
      {options.map((option) => (
        // 不写死背景色：原先硬编码的深色在浅色模式下是深底深字，选项几乎不可读
        <option key={option.value} value={option.value} className="bg-surface text-ink">
          {option.label}
        </option>
      ))}
    </select>
  )
}
