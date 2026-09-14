import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({ open, title, description, onClose, children, footer, width = 420 }: ModalProps) {
  useEffect(() => {
    if (!open) return () => undefined
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="no-drag absolute inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭弹窗"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{ width }}
        className={cn(
          'glass-card-strong relative z-10 flex max-h-full flex-col overflow-hidden rounded-widget',
          'shadow-glass animate-pop-in'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line/8 px-4 py-3">
          <div className="flex flex-col">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[11.5px] text-subtle">{description}</p> : null}
          </div>
          <IconButton label="关闭" size="sm" onClick={onClose}>
            <X size={14} />
          </IconButton>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-3.5">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-line/8 px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
