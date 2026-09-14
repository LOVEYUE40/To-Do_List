import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
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
  children: ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-ink">{label}</span>
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
}

export function Select<T extends string>({ value, options, onChange, className }: SelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={cn(
        'no-drag h-8 cursor-pointer rounded-lg border border-line/12 bg-surface/60 px-2 text-[12.5px] text-ink',
        'outline-none transition-colors duration-150 hover:border-line/25 focus:border-accent/60',
        className
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#111827] text-ink">
          {option.label}
        </option>
      ))}
    </select>
  )
}
