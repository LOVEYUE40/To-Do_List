import { ArrowUpDown, Eraser, Search, Undo2 } from 'lucide-react'
import type { FilterStatus, Priority, SortKey } from '@shared/types'
import { IconButton, Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Controls'
import { useTodoStore } from '@/store/useTodoStore'

const STATUS_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'today', label: '今天' },
  { value: 'overdue', label: '逾期' }
]

const PRIORITY_OPTIONS: Array<{ value: Priority | 'any'; label: string }> = [
  { value: 'any', label: '全部优先级' },
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
  { value: 'none', label: '无优先级' }
]

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'manual', label: '手动排序' },
  { value: 'created', label: '创建时间' },
  { value: 'due', label: '截止时间' },
  { value: 'priority', label: '优先级' },
  { value: 'title', label: '标题' }
]

export function TaskToolbar() {
  const keyword = useTodoStore((state) => state.ui.keyword)
  const status = useTodoStore((state) => state.ui.status)
  const priority = useTodoStore((state) => state.ui.priority)
  const sort = useTodoStore((state) => state.ui.sort)
  const setUi = useTodoStore((state) => state.setUi)
  const clearCompleted = useTodoStore((state) => state.clearCompleted)
  const undoDelete = useTodoStore((state) => state.undoDelete)
  const lastDeleted = useTodoStore((state) => state.lastDeleted)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="no-drag flex-1">
          <Input
            icon={<Search size={13} />}
            value={keyword}
            placeholder="搜索标题、备注或标签"
            onChange={(event) => setUi({ keyword: event.target.value })}
          />
        </div>
        <IconButton
          label="撤销上一次删除"
          disabled={!lastDeleted}
          onClick={undoDelete}
          className="h-[35px] w-[35px]"
        >
          <Undo2 size={13} />
        </IconButton>
        <IconButton label="清空已完成任务" onClick={clearCompleted} className="h-[35px] w-[35px]">
          <Eraser size={13} />
        </IconButton>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Segmented
          value={status}
          options={STATUS_OPTIONS}
          onChange={(status) => setUi({ status })}
          className="flex-1"
        />

        <Select
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={(priority) => setUi({ priority })}
        />

        <div className="flex items-center gap-1">
          <ArrowUpDown size={12} className="text-subtle" />
          <Select value={sort} options={SORT_OPTIONS} onChange={(sort) => setUi({ sort })} />
        </div>
      </div>

      {sort !== 'manual' ? (
        <div className="flex items-center justify-between rounded-lg border border-line/8 bg-line/[0.04] px-2 py-1">
          <span className="text-[11px] text-subtle">当前为自动排序，拖动排序已暂时关闭</span>
          <Button size="sm" variant="ghost" onClick={() => setUi({ sort: 'manual' })}>
            恢复手动排序
          </Button>
        </div>
      ) : null}
    </div>
  )
}
