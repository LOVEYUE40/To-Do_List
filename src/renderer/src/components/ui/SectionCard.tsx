import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionCardProps {
  title: ReactNode
  /** 标题前的图标，统一渲染为强调色 */
  icon?: ReactNode
  /** 标题右侧的操作区（按钮、徽标、分段控件等） */
  extra?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}

/**
 * 统一的分区卡片：玻璃底 + 图标标题头。
 * 这套结构此前在 6 个视图里被复制了十几份，调整标题字号或内边距要改多处。
 */
export function SectionCard({ title, icon, extra, id, className, children }: SectionCardProps) {
  return (
    <section id={id} className={cn('glass-card rounded-card p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          {icon ? <span className="text-accent">{icon}</span> : null}
          {title}
        </h3>
        {extra}
      </div>
      {children}
    </section>
  )
}
