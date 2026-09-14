import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'subtle' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-gradient-to-br from-accent to-accent2 shadow-glow hover:brightness-110 active:brightness-95',
  subtle: 'bg-line/10 text-ink border border-line/10 hover:bg-line/[0.16] active:bg-line/20',
  ghost: 'text-muted hover:text-ink hover:bg-line/10 active:bg-line/[0.14]',
  outline: 'border border-line/20 text-ink hover:border-accent/60 hover:bg-accent/10',
  danger: 'border border-red-500/45 text-red-400 hover:bg-red-500/12 active:bg-red-500/20'
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[12px] rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-[13px] rounded-xl gap-2',
  lg: 'h-11 px-5 text-[14px] rounded-2xl gap-2'
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  block?: boolean
}

export function Button({
  variant = 'subtle',
  size = 'md',
  icon,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'no-drag inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-all duration-150 ease-out active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  size?: 'sm' | 'md'
}

export function IconButton({ label, active, size = 'md', className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={cn(
        'no-drag inline-flex shrink-0 items-center justify-center rounded-xl border transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95',
        'disabled:pointer-events-none disabled:opacity-40',
        size === 'md' ? 'h-8 w-8' : 'h-6 w-6',
        active
          ? 'border-accent/50 bg-accent/18 text-accent'
          : 'border-line/10 bg-line/[0.07] text-muted hover:border-line/20 hover:bg-line/12 hover:text-ink',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
