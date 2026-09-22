import { describe, expect, it } from 'vitest'
import {
  buildTrend,
  computeListStats,
  computeStats,
  filterItems,
  matchesSmartView,
  normalizeItem,
  normalizeItemsPatch,
  normalizeList,
  normalizeListsPatch,
  normalizeSettings,
  sortItems,
  validateAppData
} from '../utils'
import { DEFAULT_SETTINGS, MAX_IMPORT_ITEMS, SCHEMA_VERSION } from '../constants'
import type { AppData, TodoItem, TodoList } from '../types'

const DAY = 24 * 60 * 60 * 1000

function makeItem(patch: Partial<TodoItem> = {}): TodoItem {
  const now = Date.now()
  return {
    id: patch.id ?? 'task_1',
    listId: patch.listId ?? 'list_inbox',
    title: patch.title ?? '任务',
    note: patch.note ?? '',
    done: patch.done ?? false,
    priority: patch.priority ?? 'none',
    tags: patch.tags ?? [],
    dueAt: patch.dueAt ?? null,
    remindAt: patch.remindAt ?? null,
    notified: patch.notified ?? false,
    createdAt: patch.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now,
    completedAt: patch.completedAt ?? null,
    order: patch.order ?? 0
  }
}

function makeList(patch: Partial<TodoList> = {}): TodoList {
  return {
    id: patch.id ?? 'list_inbox',
    name: patch.name ?? '收集箱',
    color: patch.color ?? '#7C5CFF',
    order: patch.order ?? 0,
    createdAt: patch.createdAt ?? Date.now()
  }
}

/* ------------------------------------------------------------------ */
/* normalizeSettings                                                   */
/* ------------------------------------------------------------------ */

describe('normalizeSettings', () => {
  it('把数值字段钳制在合法区间', () => {
    const result = normalizeSettings({ opacity: 5, glassAlpha: -3, blur: 999 })
    expect(result.opacity).toBe(1)
    expect(result.glassAlpha).toBe(0)
    expect(result.blur).toBe(28)
  })

  it('opacity 低于下限时抬到 0.3，避免窗口几乎不可见', () => {
    expect(normalizeSettings({ opacity: 0.01 }).opacity).toBe(0.3)
  })

  it('非法主题 / 配色模式 / 窗口形态一律回退默认值', () => {
    const result = normalizeSettings({
      theme: '不存在的主题',
      colorScheme: 'rainbow',
      windowMode: 'floating'
    })
    expect(result.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(result.colorScheme).toBe(DEFAULT_SETTINGS.colorScheme)
    expect(result.windowMode).toBe('widget')
  })

  it('废弃的午夜霓虹配色自动迁移为暖纸，避免老配置跳回默认主题', () => {
    expect(normalizeSettings({ theme: 'midnight' }).theme).toBe('warmpaper')
  })

  it('自定义强调色必须是合法 6 位十六进制', () => {
    expect(normalizeSettings({ customAccent: '#ABCDEF' }).customAccent).toBe('#ABCDEF')
    expect(normalizeSettings({ customAccent: 'red' }).customAccent).toBe(DEFAULT_SETTINGS.customAccent)
    expect(normalizeSettings({ customAccent: '#12345' }).customAccent).toBe(DEFAULT_SETTINGS.customAccent)
  })

  it('字符串 "false" 必须读成 false，而不是被 Boolean() 当成真值', () => {
    const result = normalizeSettings({
      alwaysOnTop: 'false',
      launchAtLogin: 'false',
      hardenReadability: '0',
      disableHardwareAcceleration: 'off',
      autoUpdateCheck: 'no'
    })
    expect(result.alwaysOnTop).toBe(false)
    expect(result.launchAtLogin).toBe(false)
    expect(result.hardenReadability).toBe(false)
    expect(result.disableHardwareAcceleration).toBe(false)
    expect(result.autoUpdateCheck).toBe(false)
  })

  it('字符串 "true" 与数字 1 读成 true', () => {
    const result = normalizeSettings({ alwaysOnTop: 'true', launchAtLogin: 1 })
    expect(result.alwaysOnTop).toBe(true)
    expect(result.launchAtLogin).toBe(true)
  })

  it('guideVersion 取非负整数，非法值回退为 0（表示从未看过引导）', () => {
    expect(normalizeSettings({ guideVersion: 3.7 }).guideVersion).toBe(3)
    expect(normalizeSettings({ guideVersion: -1 }).guideVersion).toBe(0)
    expect(normalizeSettings({ guideVersion: 'abc' }).guideVersion).toBe(0)
  })

  it('bounds 含 NaN 时整体丢弃，避免窗口被移到屏幕外', () => {
    expect(normalizeSettings({ bounds: { x: Number.NaN, y: 0, width: 400, height: 600 } }).bounds).toBeUndefined()
    expect(normalizeSettings({ bounds: { x: 10, y: 20, width: 400, height: 600 } }).bounds).toEqual({
      x: 10,
      y: 20,
      width: 400,
      height: 600
    })
  })

  it('bounds 尺寸被钳制在 200~4000', () => {
    const result = normalizeSettings({ bounds: { x: 0, y: 0, width: 99999, height: 1 } })
    expect(result.bounds?.width).toBe(4000)
    expect(result.bounds?.height).toBe(200)
  })

  it('shortcuts 与默认值合并，缺失的键不会变成 undefined', () => {
    const result = normalizeSettings({ shortcuts: { toggle: 'F1' } })
    expect(result.shortcuts.toggle).toBe('F1')
    expect(result.shortcuts.quickAdd).toBe(DEFAULT_SETTINGS.shortcuts.quickAdd)
  })

  it('传入空值时返回一份完整默认设置', () => {
    const result = normalizeSettings(undefined)
    expect(result.opacity).toBe(DEFAULT_SETTINGS.opacity)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
  })
})

/* ------------------------------------------------------------------ */
/* normalizeItem / normalizeList                                       */
/* ------------------------------------------------------------------ */

describe('normalizeItem', () => {
  it('非对象或缺少标题的元素被丢弃', () => {
    expect(normalizeItem(null, 'list_inbox', 0)).toBeNull()
    expect(normalizeItem('字符串', 'list_inbox', 0)).toBeNull()
    expect(normalizeItem({ title: '   ' }, 'list_inbox', 0)).toBeNull()
    expect(normalizeItem({ note: '只有备注' }, 'list_inbox', 0)).toBeNull()
  })

  it('NaN 时间戳被置为 null，否则会破坏排序与智能视图过滤', () => {
    const item = normalizeItem({ title: '任务', dueAt: Number.NaN, remindAt: Number.NaN }, 'list_inbox', 0)
    expect(item?.dueAt).toBeNull()
    expect(item?.remindAt).toBeNull()
  })

  it('priority 不在白名单内时回退 none', () => {
    expect(normalizeItem({ title: '任务', priority: 'urgent' }, 'list_inbox', 0)?.priority).toBe('none')
    expect(normalizeItem({ title: '任务', priority: 'high' }, 'list_inbox', 0)?.priority).toBe('high')
  })

  it('tags 过滤掉非字符串并截断到 12 个', () => {
    const tags = [...Array.from({ length: 20 }, (_, i) => `t${i}`), 42, null]
    const item = normalizeItem({ title: '任务', tags }, 'list_inbox', 0)
    expect(item?.tags).toHaveLength(12)
    expect(item?.tags.every((tag) => typeof tag === 'string')).toBe(true)
  })

  it('缺少 listId 时挂到 fallbackListId', () => {
    expect(normalizeItem({ title: '任务' }, 'list_fallback', 0)?.listId).toBe('list_fallback')
  })
})

describe('normalizeList', () => {
  it('非对象或空名称被丢弃', () => {
    expect(normalizeList(null, 0)).toBeNull()
    expect(normalizeList({ name: '  ' }, 0)).toBeNull()
  })

  it('缺少颜色时使用默认强调色', () => {
    expect(normalizeList({ name: '工作' }, 0)?.color).toBe('#7C5CFF')
  })
})

/* ------------------------------------------------------------------ */
/* validateAppData                                                     */
/* ------------------------------------------------------------------ */

describe('validateAppData', () => {
  it('非对象直接拒绝', () => {
    expect(validateAppData(null).ok).toBe(false)
    expect(validateAppData('文本').ok).toBe(false)
  })

  it('缺少 lists 或 items 时给出可读原因', () => {
    const result = validateAppData({ lists: [] })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('lists')
  })

  it('任务数超过上限时拒绝导入', () => {
    const items = Array.from({ length: MAX_IMPORT_ITEMS + 1 }, (_, i) => makeItem({ id: `t${i}` }))
    const result = validateAppData({ lists: [makeList()], items })
    expect(result.ok).toBe(false)
    expect(result.error).toContain(String(MAX_IMPORT_ITEMS))
  })

  it('没有任何有效清单时拒绝', () => {
    expect(validateAppData({ lists: [{ name: '' }], items: [] }).ok).toBe(false)
  })

  it('重复的任务 id 会被去重，避免渲染层出现重复 key', () => {
    const result = validateAppData({
      lists: [makeList()],
      items: [makeItem({ id: 'dup' }), makeItem({ id: 'dup' }), makeItem({ id: 'dup' })]
    })
    expect(result.ok).toBe(true)
    const ids = result.data?.items.map((item) => item.id) ?? []
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('导入的畸形元素被静默丢弃，而不是让整份数据失败', () => {
    const result = validateAppData({
      lists: [makeList()],
      items: [null, { title: '' }, makeItem({ title: '有效任务' }), 123]
    })
    expect(result.ok).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.items[0].title).toBe('有效任务')
  })

  it('规范化后的设置随数据一并返回', () => {
    const result = validateAppData({ lists: [makeList()], items: [], settings: { opacity: 9 } })
    expect(result.data?.settings.opacity).toBe(1)
  })
})

/* ------------------------------------------------------------------ */
/* normalizeItemsPatch / normalizeListsPatch（data:save 入参校验）      */
/* ------------------------------------------------------------------ */

describe('normalizeItemsPatch', () => {
  it('非数组返回 null，调用方应整体忽略该字段', () => {
    expect(normalizeItemsPatch(undefined, 'list_inbox')).toBeNull()
    expect(normalizeItemsPatch({}, 'list_inbox')).toBeNull()
    expect(normalizeItemsPatch('[]', 'list_inbox')).toBeNull()
  })

  it('丢弃畸形元素——这是提醒轮询崩溃的根源', () => {
    const result = normalizeItemsPatch([null, { title: '' }, makeItem({ title: 'ok' })], 'list_inbox')
    expect(result).toHaveLength(1)
    expect(result?.[0].title).toBe('ok')
  })

  it('重复 id 会被重新分配，保证 id 唯一', () => {
    const result = normalizeItemsPatch([makeItem({ id: 'dup' }), makeItem({ id: 'dup' })], 'list_inbox')
    expect(result).toHaveLength(2)
    expect(result?.[0].id).not.toBe(result?.[1].id)
  })

  it('刻意不套用 MAX_IMPORT_ITEMS：渲染层是这份数据的合法所有者', () => {
    const items = Array.from({ length: MAX_IMPORT_ITEMS + 10 }, (_, i) => makeItem({ id: `t${i}` }))
    expect(normalizeItemsPatch(items, 'list_inbox')).toHaveLength(MAX_IMPORT_ITEMS + 10)
  })

  it('空数组是合法的，返回空数组而不是 null', () => {
    expect(normalizeItemsPatch([], 'list_inbox')).toEqual([])
  })
})

describe('normalizeListsPatch', () => {
  it('非数组返回 null', () => {
    expect(normalizeListsPatch(null)).toBeNull()
  })

  it('丢弃空名称清单并去重 id', () => {
    const result = normalizeListsPatch([{ name: '' }, makeList({ id: 'dup' }), makeList({ id: 'dup', name: '工作' })])
    expect(result).toHaveLength(2)
    expect(result?.[0].id).not.toBe(result?.[1].id)
  })
})

/* ------------------------------------------------------------------ */
/* 筛选与排序                                                          */
/* ------------------------------------------------------------------ */

describe('matchesSmartView', () => {
  const now = new Date('2026-09-17T10:00:00').getTime()

  it('smart:all 匹配所有任务', () => {
    expect(matchesSmartView(makeItem(), 'smart:all', now)).toBe(true)
  })

  it('smart:today 只匹配今天到期且未完成的任务', () => {
    expect(matchesSmartView(makeItem({ dueAt: now }), 'smart:today', now)).toBe(true)
    expect(matchesSmartView(makeItem({ dueAt: now + 2 * DAY }), 'smart:today', now)).toBe(false)
    expect(matchesSmartView(makeItem({ dueAt: now, done: true }), 'smart:today', now)).toBe(false)
  })

  it('smart:overdue 只匹配已过期且未完成的任务', () => {
    expect(matchesSmartView(makeItem({ dueAt: now - DAY }), 'smart:overdue', now)).toBe(true)
    expect(matchesSmartView(makeItem({ dueAt: now + DAY }), 'smart:overdue', now)).toBe(false)
    expect(matchesSmartView(makeItem({ dueAt: now - DAY, done: true }), 'smart:overdue', now)).toBe(false)
  })

  it('普通清单 id 按 listId 精确匹配', () => {
    expect(matchesSmartView(makeItem({ listId: 'list_work' }), 'list_work', now)).toBe(true)
    expect(matchesSmartView(makeItem({ listId: 'list_work' }), 'list_life', now)).toBe(false)
  })
})

describe('filterItems', () => {
  const now = Date.now()

  it('关键词同时匹配标题、备注与标签', () => {
    const items = [
      makeItem({ id: 'a', title: '写周报' }),
      makeItem({ id: 'b', title: '其他', note: '包含周报关键字' }),
      makeItem({ id: 'c', title: '其他', tags: ['周报'] })
    ]
    const result = filterItems(items, { listId: 'smart:all', status: 'all', priority: 'any', keyword: '周报', now })
    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('关键词匹配大小写不敏感', () => {
    const items = [makeItem({ title: 'Fix Bug' })]
    const result = filterItems(items, { listId: 'smart:all', status: 'all', priority: 'any', keyword: 'fix', now })
    expect(result).toHaveLength(1)
  })

  it('status=active / done 互斥', () => {
    const items = [makeItem({ id: 'a', done: false }), makeItem({ id: 'b', done: true })]
    const base = { listId: 'smart:all', priority: 'any' as const, keyword: '', now }
    expect(filterItems(items, { ...base, status: 'active' }).map((i) => i.id)).toEqual(['a'])
    expect(filterItems(items, { ...base, status: 'done' }).map((i) => i.id)).toEqual(['b'])
  })

  it('priority 筛选生效，any 表示不限', () => {
    const items = [makeItem({ id: 'a', priority: 'high' }), makeItem({ id: 'b', priority: 'low' })]
    const base = { listId: 'smart:all', status: 'all' as const, keyword: '', now }
    expect(filterItems(items, { ...base, priority: 'high' }).map((i) => i.id)).toEqual(['a'])
    expect(filterItems(items, { ...base, priority: 'any' })).toHaveLength(2)
  })
})

describe('sortItems', () => {
  it('已完成任务统一沉底', () => {
    const items = [
      makeItem({ id: 'done', done: true, order: 0 }),
      makeItem({ id: 'active', done: false, order: 1 })
    ]
    expect(sortItems(items, 'manual').map((item) => item.id)).toEqual(['active', 'done'])
  })

  it('due 排序把无截止时间的任务放在最后', () => {
    const now = Date.now()
    const items = [
      makeItem({ id: 'none', dueAt: null }),
      makeItem({ id: 'later', dueAt: now + DAY }),
      makeItem({ id: 'sooner', dueAt: now + 1000 })
    ]
    expect(sortItems(items, 'due').map((item) => item.id)).toEqual(['sooner', 'later', 'none'])
  })

  it('priority 排序按 高 > 中 > 低 > 无', () => {
    const items = [
      makeItem({ id: 'none', priority: 'none' }),
      makeItem({ id: 'high', priority: 'high' }),
      makeItem({ id: 'low', priority: 'low' }),
      makeItem({ id: 'medium', priority: 'medium' })
    ]
    expect(sortItems(items, 'priority').map((item) => item.id)).toEqual(['high', 'medium', 'low', 'none'])
  })

  it('不修改传入数组', () => {
    const items = [makeItem({ id: 'b', order: 1 }), makeItem({ id: 'a', order: 0 })]
    const snapshot = items.map((item) => item.id)
    sortItems(items, 'manual')
    expect(items.map((item) => item.id)).toEqual(snapshot)
  })
})

/* ------------------------------------------------------------------ */
/* 统计                                                                */
/* ------------------------------------------------------------------ */

describe('computeStats', () => {
  const now = new Date('2026-09-17T10:00:00').getTime()

  it('统计总数、完成数与完成率', () => {
    const items = [makeItem({ done: true }), makeItem({ done: true }), makeItem({ done: false })]
    const stats = computeStats(items, [], now)
    expect(stats.total).toBe(3)
    expect(stats.done).toBe(2)
    expect(stats.active).toBe(1)
    expect(stats.completionRate).toBe(67)
  })

  it('空数据不产生除零错误', () => {
    expect(computeStats([], [], now).completionRate).toBe(0)
  })

  it('连续完成天数从今天向前回溯，中间断档即停止', () => {
    const items = [
      makeItem({ done: true, completedAt: now }),
      makeItem({ done: true, completedAt: now - DAY }),
      makeItem({ done: true, completedAt: now - 2 * DAY }),
      // 第 3 天缺失，回溯应在此中断
      makeItem({ done: true, completedAt: now - 4 * DAY })
    ]
    expect(computeStats(items, [], now).streak).toBe(3)
  })

  it('今天还没完成任务时，从昨天开始计算连续天数', () => {
    const items = [makeItem({ done: true, completedAt: now - DAY }), makeItem({ done: true, completedAt: now - 2 * DAY })]
    expect(computeStats(items, [], now).streak).toBe(2)
  })

  it('逾期与今天到期只统计未完成任务', () => {
    const items = [
      makeItem({ dueAt: now - DAY }),
      makeItem({ dueAt: now - DAY, done: true }),
      makeItem({ dueAt: now })
    ]
    const stats = computeStats(items, [], now)
    expect(stats.overdue).toBe(1)
    expect(stats.dueToday).toBe(1)
  })
})

describe('buildTrend', () => {
  const now = new Date('2026-09-17T10:00:00').getTime()

  it('返回指定天数且按时间正序排列', () => {
    const trend = buildTrend([], 7, now)
    expect(trend).toHaveLength(7)
    expect(trend[trend.length - 1].label).toBe('9/17')
  })

  it('按天分桶统计新增与完成', () => {
    const items = [
      makeItem({ createdAt: now, done: true, completedAt: now }),
      makeItem({ createdAt: now - DAY })
    ]
    const trend = buildTrend(items, 7, now)
    const today = trend[trend.length - 1]
    const yesterday = trend[trend.length - 2]
    expect(today.created).toBe(1)
    expect(today.completed).toBe(1)
    expect(yesterday.created).toBe(1)
    expect(yesterday.completed).toBe(0)
  })

  it('超出时间窗的任务不计入', () => {
    const trend = buildTrend([makeItem({ createdAt: now - 30 * DAY })], 7, now)
    expect(trend.reduce((sum, point) => sum + point.created, 0)).toBe(0)
  })
})

describe('computeListStats', () => {
  it('按清单统计完成率并降序排列', () => {
    const lists = [makeList({ id: 'a', name: 'A' }), makeList({ id: 'b', name: 'B' })]
    const items = [
      makeItem({ listId: 'a', done: true }),
      makeItem({ listId: 'a', done: true }),
      makeItem({ listId: 'b', done: false })
    ]
    const result = computeListStats(items, lists)
    expect(result[0]).toMatchObject({ id: 'a', total: 2, done: 2, rate: 100 })
    expect(result[1]).toMatchObject({ id: 'b', total: 1, done: 0, rate: 0 })
  })

  it('空清单完成率为 0 而不是 NaN', () => {
    expect(computeListStats([], [makeList({ id: 'empty' })])[0].rate).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/* 端到端：一份损坏的导入数据不能污染内存                               */
/* ------------------------------------------------------------------ */

describe('导入 → 保存 的完整链路', () => {
  it('导入的脏数据经规范化后不再包含可致崩的元素', () => {
    const raw: unknown = {
      lists: [makeList()],
      items: [null, { title: '' }, makeItem({ title: '真实任务', dueAt: Number.NaN })],
      settings: { opacity: 'abc', alwaysOnTop: 'false' }
    }

    const imported = validateAppData(raw)
    expect(imported.ok).toBe(true)
    const data = imported.data as AppData

    // 模拟渲染层把导入结果再写回主进程
    const saved = normalizeItemsPatch(data.items, data.lists[0].id)
    expect(saved).toHaveLength(1)
    expect(saved?.[0].title).toBe('真实任务')
    expect(saved?.[0].dueAt).toBeNull()

    // 提醒轮询会解引用 item.done，脏元素已被彻底清除
    expect(saved?.every((item) => typeof item.done === 'boolean')).toBe(true)
  })
})
