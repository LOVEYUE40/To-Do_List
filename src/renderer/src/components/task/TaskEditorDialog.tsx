import { useEffect, useState } from 'react'
import { Bell, CalendarDays, Flag, Tag } from 'lucide-react'
import type { Priority, TodoItem } from '@shared/types'
import { PRIORITY_META } from '@shared/constants'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, TextArea } from '@/components/ui/Field'
import { Segmented, Switch } from '@/components/ui/Controls'
import { Modal } from '@/components/ui/Modal'
import { REMIND_LEAD_OPTIONS, fromDatetimeLocal, toDatetimeLocal } from '@/lib/format'
import { useTodoStore } from '@/store/useTodoStore'

interface TaskEditorDialogProps {
  open: boolean
  item: TodoItem | null
  defaultListId: string
  /** 新建任务时预填的标题（来自快速添加框的草稿） */
  initialTitle?: string
  onClose: () => void
}

const PRIORITY_SEGMENTS: Array<{ value: Priority; label: string }> = [
  { value: 'none', label: PRIORITY_META.none.short },
  { value: 'low', label: PRIORITY_META.low.short },
  { value: 'medium', label: PRIORITY_META.medium.short },
  { value: 'high', label: PRIORITY_META.high.short }
]

export function TaskEditorDialog({ open, item, defaultListId, initialTitle = '', onClose }: TaskEditorDialogProps) {
  const lists = useTodoStore((state) => state.lists)
  const addItem = useTodoStore((state) => state.addItem)
  const updateItem = useTodoStore((state) => state.updateItem)

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [listId, setListId] = useState(defaultListId)
  const [priority, setPriority] = useState<Priority>('none')
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [due, setDue] = useState('')
  const [remind, setRemind] = useState(false)
  const [lead, setLead] = useState(15)

  useEffect(() => {
    if (!open) return
    setTitle(item?.title ?? initialTitle)
    setNote(item?.note ?? '')
    setListId(item?.listId ?? defaultListId)
    setPriority(item?.priority ?? 'none')
    setTags(item?.tags ?? [])
    setTagDraft('')
    setDue(toDatetimeLocal(item?.dueAt))
    setRemind(Boolean(item?.remindAt))
    if (item?.dueAt && item?.remindAt) {
      const diffMinutes = Math.round((item.dueAt - item.remindAt) / 60_000)
      setLead(REMIND_LEAD_OPTIONS.some((option) => option.value === diffMinutes) ? diffMinutes : 0)
    } else {
      setLead(15)
    }
  }, [open, item, defaultListId, initialTitle])

  const commitTag = (): void => {
    const value = tagDraft.trim().replace(/^#/, '')
    if (!value || tags.includes(value) || tags.length >= 12) {
      setTagDraft('')
      return
    }
    setTags([...tags, value])
    setTagDraft('')
  }

  const handleSave = (): void => {
    const trimmed = title.trim()
    if (!trimmed) return
    const dueAt = fromDatetimeLocal(due)
    const remindAt = remind && dueAt ? dueAt - lead * 60_000 : null
    const payload = {
      title: trimmed,
      note: note.trim(),
      listId,
      priority,
      tags,
      dueAt,
      remindAt,
      notified: false
    }
    if (item) {
      updateItem(item.id, payload)
    } else {
      addItem(payload)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      title={item ? '编辑任务' : '新建任务'}
      description={item ? '修改后立即生效并自动保存到本地' : '回车即可快速创建，也可以补充更多细节'}
      onClose={onClose}
      width={430}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>
            {item ? '保存修改' : '创建任务'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="任务标题" hint={`${title.length}/120`} htmlFor="task-editor-title">
          <Input
            id="task-editor-title"
            autoFocus
            maxLength={120}
            value={title}
            placeholder="例如：整理本周项目周报并同步给团队"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSave()
            }}
          />
        </Field>

        <Field label="备注说明" hint="可选" htmlFor="task-editor-note">
          <TextArea
            id="task-editor-note"
            rows={3}
            maxLength={500}
            value={note}
            placeholder="记录背景信息、验收标准或相关链接"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="所属清单" htmlFor="task-editor-list">
            <Select
              id="task-editor-list"
              value={listId}
              options={lists.map((list) => ({ value: list.id, label: list.name }))}
              onChange={setListId}
              className="h-9 w-full"
            />
          </Field>
          <Field label="优先级">
            <Segmented value={priority} options={PRIORITY_SEGMENTS} onChange={setPriority} className="w-full" />
          </Field>
        </div>

        <Field label="标签" hint="回车添加，最多 12 个">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line/12 bg-surface/50 px-2 py-1.5">
            <Tag size={12} className="shrink-0 text-subtle" />
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                title="点击移除"
                onClick={() => setTags(tags.filter((value) => value !== tag))}
                className="cursor-pointer rounded-pill border border-accent/40 bg-accent/14 px-2 py-[1px] text-[11px] text-accent transition-colors hover:bg-red-500/16 hover:text-red-400"
              >
                #{tag}
              </button>
            ))}
            <input
              aria-label="添加标签"
              value={tagDraft}
              placeholder={tags.length === 0 ? '输入标签后回车' : ''}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitTag()
                }
                if (event.key === 'Backspace' && !tagDraft && tags.length > 0) {
                  setTags(tags.slice(0, -1))
                }
              }}
              className="min-w-[70px] flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-subtle"
            />
          </div>
        </Field>

        <div className="rounded-xl border border-line/10 bg-line/[0.04] p-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={13} className="text-accent" />
            <span className="text-[12.5px] font-medium text-ink">截止时间</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11.5px] text-subtle">到期提醒</span>
              <Switch checked={remind} onChange={setRemind} label="到期提醒" disabled={!due} />
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="datetime-local"
              aria-label="截止时间"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              className="field-input no-drag flex-1 py-[7px] text-[12.5px]"
            />
            {due ? (
              <Button size="sm" variant="ghost" onClick={() => setDue('')}>
                清除
              </Button>
            ) : null}
          </div>

          {remind && due ? (
            <div className="mt-2 flex items-center gap-2">
              <Bell size={12} className="text-subtle" />
              <Select
                aria-label="提醒时机"
                value={String(lead)}
                options={REMIND_LEAD_OPTIONS.map((option) => ({
                  value: String(option.value),
                  label: option.label
                }))}
                onChange={(value) => setLead(Number(value))}
                className="flex-1"
              />
              <span className="text-[11px] text-subtle">由系统通知弹出</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-line/8 bg-line/[0.03] px-3 py-2">
          <Flag size={12} className="mt-[3px] shrink-0 text-subtle" />
          <p className="text-[11px] leading-relaxed text-subtle">
            优先级用于筛选与排序；截止时间留空表示该任务没有明确时间要求。所有修改都会实时写入本地数据文件。
          </p>
        </div>
      </div>
    </Modal>
  )
}
