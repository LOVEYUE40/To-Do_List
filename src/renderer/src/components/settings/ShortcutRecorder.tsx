import { useState, type KeyboardEvent } from 'react'
import { Keyboard } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatShortcut } from '@/lib/format'

interface ShortcutRecorderProps {
  value: string
  onChange: (accelerator: string) => void
}

const MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Tab', 'Escape']

/**
 * 快捷键录入：聚焦后按下组合键即可录制。
 * 只接受「修饰键 + 主键」形式，避免与单键输入冲突。
 */
export function ShortcutRecorder({ value, onChange }: ShortcutRecorderProps) {
  const [listening, setListening] = useState(false)

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    if (event.key === 'Escape') {
      setListening(false)
      return
    }
    if (MODIFIER_KEYS.includes(event.key)) return

    const parts: string[] = []
    if (event.ctrlKey) parts.push('CommandOrControl')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')

    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
    parts.push(key)

    if (parts.length < 2) return
    onChange(parts.join('+'))
    setListening(false)
  }

  return (
    <button
      type="button"
      autoFocus={listening}
      onFocus={() => setListening(true)}
      onBlur={() => setListening(false)}
      onKeyDown={handleKeyDown}
      className={cn(
        'no-drag flex h-7 min-w-[124px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2',
        'font-mono text-[11px] transition-colors duration-150',
        listening
          ? 'border-accent/70 bg-accent/12 text-accent'
          : 'border-line/15 bg-line/[0.06] text-muted hover:border-line/25 hover:text-ink'
      )}
    >
      <Keyboard size={11} />
      {listening ? '请按下组合键…' : formatShortcut(value)}
    </button>
  )
}
