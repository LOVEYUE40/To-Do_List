import { create } from 'zustand'
import type { AppData, FilterStatus, Priority, SortKey, TodoItem, TodoList, ViewId } from '@shared/types'
import { SCHEMA_VERSION, STORAGE_KEYS } from '@shared/constants'
import { uid } from '@shared/utils'
import { desktop } from '@/lib/desktop-api'

export interface UiState {
  activeListId: string
  view: ViewId
  status: FilterStatus
  priority: Priority | 'any'
  sort: SortKey
  keyword: string
  sidebarCollapsed: boolean
}

const DEFAULT_UI: UiState = {
  activeListId: 'smart:all',
  view: 'todo',
  status: 'all',
  priority: 'any',
  sort: 'manual',
  keyword: '',
  sidebarCollapsed: false
}

interface DeletedSnapshot {
  item: TodoItem
  index: number
}

interface TodoStore {
  lists: TodoList[]
  items: TodoItem[]
  ui: UiState
  ready: boolean
  toast: string | null
  lastDeleted: DeletedSnapshot | null
  /** 递增信号：托盘/快捷键快速新增时用于聚焦输入框 */
  quickAddSignal: number

  load: () => Promise<void>
  hydrate: (data: AppData) => void
  setUi: (patch: Partial<UiState>) => void
  setToast: (message: string | null) => void
  markNotified: (id: string) => void
  requestQuickAdd: () => void

  addItem: (input: {
    title: string
    listId?: string
    note?: string
    priority?: Priority
    tags?: string[]
    dueAt?: number | null
    remindAt?: number | null
  }) => void
  updateItem: (id: string, patch: Partial<TodoItem>) => void
  toggleDone: (id: string) => void
  removeItem: (id: string) => void
  undoDelete: () => void
  clearCompleted: () => void
  moveItems: (orderedIds: string[]) => void

  addList: (name: string, color?: string) => void
  updateList: (id: string, patch: Partial<TodoList>) => void
  removeList: (id: string) => void
}

function readUi(): UiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.uiState)
    if (!raw) return { ...DEFAULT_UI }
    return { ...DEFAULT_UI, ...(JSON.parse(raw) as Partial<UiState>) }
  } catch (err) {
    console.error('[ui-state] 读取失败，使用默认值：', err)
    return { ...DEFAULT_UI }
  }
}

function writeUi(ui: UiState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.uiState, JSON.stringify(ui))
  } catch (err) {
    console.error('[ui-state] 写入失败：', err)
  }
}

/** uiState（如搜索关键词）高频变化，防抖写 localStorage，避免每次击键都同步落盘 */
let uiWriteTimer: ReturnType<typeof setTimeout> | null = null

function writeUiDebounced(ui: UiState): void {
  if (uiWriteTimer) clearTimeout(uiWriteTimer)
  uiWriteTimer = setTimeout(() => {
    uiWriteTimer = null
    writeUi(ui)
  }, 300)
}

/** 渲染层再防抖一次，避免连续输入触发大量 IPC；主进程另有 300ms 原子写防抖 */
let persistTimer: ReturnType<typeof setTimeout> | null = null

function persist(lists: TodoList[], items: TodoItem[]): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void desktop.data.save({ lists, items })
  }, 200)
}

export const useTodoStore = create<TodoStore>((set, get) => {
  /** 统一的提交入口：更新内存 -> 落盘 */
  const commit = (patch: Partial<Pick<TodoStore, 'lists' | 'items'>>): void => {
    set(patch as TodoStore)
    const state = get()
    persist(state.lists, state.items)
  }

  const resolveListId = (explicit?: string): string => {
    if (explicit) return explicit
    const { ui, lists } = get()
    if (!ui.activeListId.startsWith('smart:')) return ui.activeListId
    return lists[0]?.id ?? 'list_inbox'
  }

  return {
    lists: [],
    items: [],
    ui: readUi(),
    ready: false,
    toast: null,
    lastDeleted: null,
    quickAddSignal: 0,

    load: async () => {
      const data = await desktop.data.load()
      get().hydrate(data)
      set({ ready: true })
    },

    hydrate: (data) => {
      // 丢弃未触发的持久化快照：hydrate 会在下文整体替换本地数据，
      // 旧快照若稍后落盘会把主进程刚写入的数据（如导入结果）覆盖回去
      if (persistTimer) {
        clearTimeout(persistTimer)
        persistTimer = null
      }
      const ui = { ...get().ui, ...readUi() }
      const listIds = new Set(data.lists.map((item) => item.id))
      if (!ui.activeListId.startsWith('smart:') && !listIds.has(ui.activeListId)) {
        ui.activeListId = 'smart:all'
      }
      set({ lists: data.lists, items: data.items, ui })
      writeUi(ui)
    },

    setUi: (patch) => {
      const ui = { ...get().ui, ...patch }
      set({ ui })
      writeUiDebounced(ui)
    },

    setToast: (message) => set({ toast: message }),

    markNotified: (id) => {
      const items = get().items.map((item) => (item.id === id ? { ...item, notified: true } : item))
      commit({ items })
    },

    requestQuickAdd: () => {
      get().setUi({ view: 'todo' })
      set({ quickAddSignal: get().quickAddSignal + 1 })
    },

    addItem: (input) => {
      const now = Date.now()
      const listId = resolveListId(input.listId)
      const order = get().items.reduce((max, item) => Math.max(max, item.order), 0) + 1
      const item: TodoItem = {
        id: uid('task'),
        listId,
        title: input.title.trim(),
        note: input.note ?? '',
        done: false,
        priority: input.priority ?? 'none',
        tags: input.tags ?? [],
        dueAt: input.dueAt ?? null,
        remindAt: input.remindAt ?? null,
        notified: false,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        order
      }
      if (!item.title) return
      commit({ items: [...get().items, item] })
    },

    updateItem: (id, patch) => {
      const items = get().items.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item
      )
      commit({ items })
    },

    toggleDone: (id) => {
      const now = Date.now()
      const items = get().items.map((item) =>
        item.id === id
          ? { ...item, done: !item.done, completedAt: item.done ? null : now, updatedAt: now }
          : item
      )
      commit({ items })
    },

    removeItem: (id) => {
      const index = get().items.findIndex((item) => item.id === id)
      if (index < 0) return
      const snapshot = get().items[index]
      commit({ items: get().items.filter((item) => item.id !== id) })
      set({ lastDeleted: { item: snapshot, index }, toast: `已删除「${snapshot.title}」` })
    },

    undoDelete: () => {
      const snapshot = get().lastDeleted
      if (!snapshot) return
      const items = [...get().items]
      items.splice(Math.min(snapshot.index, items.length), 0, snapshot.item)
      commit({ items })
      set({ lastDeleted: null, toast: '已恢复删除的任务' })
    },

    clearCompleted: () => {
      const { ui, items } = get()
      const remaining = items.filter((item) => {
        if (!item.done) return true
        if (ui.activeListId.startsWith('smart:')) {
          return ui.activeListId === 'smart:done'
        }
        return item.listId !== ui.activeListId
      })
      const removed = items.length - remaining.length
      if (removed > 0) {
        commit({ items: remaining })
        set({ toast: `已清理 ${removed} 项已完成任务` })
      }
    },

    moveItems: (orderedIds) => {
      // 在全量序列内重排：可见项按新的拖拽顺序填回它们原本占用的位置槽，
      // 被筛选/沉底隐藏的任务位置不动，因此其相对顺序不受影响。
      const orderedIdsSet = new Set(orderedIds)
      const ordered = [...get().items].sort((a, b) => a.order - b.order)
      const byId = new Map(ordered.map((item) => [item.id, item]))
      const visibleSeq = orderedIds.map((id) => byId.get(id)).filter((item): item is TodoItem => Boolean(item))
      if (visibleSeq.length === 0) return
      let cursor = 0
      const items = ordered.map((item) => (orderedIdsSet.has(item.id) ? visibleSeq[cursor++] : item))
      commit({ items: items.map((item, index) => ({ ...item, order: index })) })
    },

    addList: (name, color) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const now = Date.now()
      const palette = ['#7C5CFF', '#22D3EE', '#22C55E', '#F59E0B', '#F472B6', '#0EA5E9']
      const list: TodoList = {
        id: uid('list'),
        name: trimmed,
        color: color ?? palette[get().lists.length % palette.length],
        order: get().lists.length,
        createdAt: now
      }
      commit({ lists: [...get().lists, list] })
      get().setUi({ activeListId: list.id })
    },

    updateList: (id, patch) => {
      commit({ lists: get().lists.map((list) => (list.id === id ? { ...list, ...patch } : list)) })
    },

    removeList: (id) => {
      const lists = get().lists.filter((list) => list.id !== id)
      if (lists.length === 0) return
      const items = get().items.filter((item) => item.listId !== id)
      commit({ lists, items })
      if (get().ui.activeListId === id) {
        get().setUi({ activeListId: 'smart:all' })
      }
      set({ toast: '清单及其任务已删除' })
    }
  }
})

export { DEFAULT_UI, SCHEMA_VERSION }
