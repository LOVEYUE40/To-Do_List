import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
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

/** 可聚焦元素选择器，用于 Tab 焦点循环 */
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ open, title, description, onClose, children, footer, width = 420 }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // 用 ref 持有 onClose：调用方普遍传内联箭头函数，
  // 直接写进依赖会让 Esc 监听在弹窗打开期间每次渲染都重新绑定。
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return () => undefined
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // 打开时把焦点移入弹窗并记住来源，关闭后归还；
  // 否则键盘焦点会留在已卸载的节点上，后续 Tab 从文档开头重新开始。
  useEffect(() => {
    if (!open) return () => undefined
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => {
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [open])

  // 简易焦点陷阱：Tab 在弹窗内循环，避免焦点跑到背后的界面上
  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab') return
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        style={{ width }}
        className={cn(
          'glass-card-strong relative z-10 flex max-h-full flex-col overflow-hidden rounded-widget outline-none',
          'shadow-glass animate-pop-in'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line/8 px-4 py-3">
          <div className="flex flex-col">
            <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-ink">
              {title}
            </h2>
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
