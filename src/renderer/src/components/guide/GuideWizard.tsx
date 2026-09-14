import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { GUIDE_VERSION } from '@shared/constants'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { useSettingsStore } from '@/store/useSettingsStore'
import { GuideIllustration } from './GuideIllustration'
import { GUIDE_STEPS } from './guideSteps'

/**
 * 首次启动引导向导。
 * 展开状态保存在内存里（useSettingsStore.guideOpen），
 * 是否「已完成」则由主进程持久化的 guideVersion 决定，
 * 因此窗口形态切换导致整窗重建后不会重复弹出。
 */
export function GuideWizard() {
  const open = useSettingsStore((state) => state.guideOpen)
  const closeGuide = useSettingsStore((state) => state.closeGuide)
  const patch = useSettingsStore((state) => state.patch)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  useEffect(() => {
    if (!open) return () => undefined
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        patch({ guideVersion: GUIDE_VERSION })
        closeGuide()
        return
      }
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(GUIDE_STEPS.length - 1, current + 1))
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, patch, closeGuide])

  if (!open) return null

  const step = GUIDE_STEPS[index]
  const Icon = step.icon
  const isLast = index === GUIDE_STEPS.length - 1

  const complete = (): void => {
    patch({ guideVersion: GUIDE_VERSION })
    closeGuide()
  }

  return (
    <div className="no-drag absolute inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/58 backdrop-blur-[3px] animate-fade-in" />

      <div className="glass-card-strong relative z-10 flex w-full max-w-[382px] flex-col gap-3 overflow-hidden rounded-widget p-4 shadow-glass animate-pop-in">
        <GuideIllustration key={step.id} variant={step.variant} />

        <div className="flex items-center gap-2">
          <span
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] text-white"
            style={{ background: 'linear-gradient(140deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))' }}
          >
            <Icon size={14} />
          </span>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">{step.title}</h2>
        </div>

        <p className="text-[12.5px] leading-[1.65] text-muted">{step.description}</p>

        <ul className="flex flex-col gap-[7px]">
          {step.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span
                className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full"
                style={{ background: 'linear-gradient(140deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))' }}
              />
              <span className="text-[12px] leading-[1.6] text-muted">{bullet}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center gap-[6px] pt-0.5">
          {GUIDE_STEPS.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`第 ${dotIndex + 1} 步：${item.title}`}
              onClick={() => setIndex(dotIndex)}
              className={cn(
                'h-[5px] cursor-pointer rounded-pill transition-all duration-200 ease-out',
                dotIndex === index ? 'w-[18px]' : 'w-[5px] bg-line/22 hover:bg-line/38'
              )}
              style={
                dotIndex === index
                  ? { background: 'linear-gradient(90deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))' }
                  : undefined
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <Button variant="ghost" size="sm" onClick={complete}>
            跳过引导
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft size={12} />}
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              上一步
            </Button>
            {isLast ? (
              <Button variant="primary" size="sm" icon={<Check size={12} />} onClick={complete}>
                开始使用
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIndex((current) => Math.min(GUIDE_STEPS.length - 1, current + 1))}
              >
                下一步
                <ArrowRight size={12} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
