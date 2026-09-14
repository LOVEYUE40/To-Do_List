import { Bell, LayoutList, ListChecks, Palette, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { IllustrationVariant } from './GuideIllustration'
import { DEFAULT_SHORTCUTS } from '@shared/constants'
import { formatShortcut } from '@/lib/format'

export interface GuideStep {
  id: string
  icon: LucideIcon
  variant: IllustrationVariant
  title: string
  description: string
  bullets: string[]
}

const toggleKey = formatShortcut(DEFAULT_SHORTCUTS.toggle)
const quickAddKey = formatShortcut(DEFAULT_SHORTCUTS.quickAdd)

/** 引导步骤数据与组件解耦：后续改版只需在这里增删条目 */
export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    variant: 'welcome',
    title: '欢迎使用待办小组件',
    description:
      '一款常驻桌面的磨砂玻璃待办工具。透明度、配色与窗口形态都能按你的桌面环境随手调整，所有数据都保存在本机。',
    bullets: [
      '桌面小组件与普通窗口两种形态，一键切换',
      '任务数据只写入本地文件，不联网、不上传',
      '随时按 ' + quickAddKey + ' 快速新增任务'
    ]
  },
  {
    id: 'tasks',
    icon: ListChecks,
    variant: 'tasks',
    title: '三步记住一件事',
    description:
      '在底部输入框输入标题后按回车即可创建任务；点击任务标题可以补充备注、标签、优先级与截止时间。',
    bullets: [
      '回车立即创建，按 Esc 取消当前输入',
      '点击左侧方块勾选完成，已完成任务自动沉底',
      '悬停任务可编辑或删除，删除后能一键撤销'
    ]
  },
  {
    id: 'organize',
    icon: LayoutList,
    variant: 'organize',
    title: '用清单与筛选保持条理',
    description:
      '左侧提供智能视图与自建清单，顶部工具条可以按状态、优先级筛选，并按创建时间、截止时间、优先级等维度排序。',
    bullets: [
      '智能视图自动聚合今天到期与已逾期任务',
      '手动排序模式下拖动左侧手柄即可调整顺序',
      '搜索框同时匹配标题、备注与标签'
    ]
  },
  {
    id: 'appearance',
    icon: Palette,
    variant: 'appearance',
    title: '把外观调成你喜欢的样子',
    description:
      '设置页可调节整体不透明度、玻璃底色浓度与毛玻璃模糊强度，并内置六套配色方案与自定义强调色。',
    bullets: [
      '一条滑块控制整窗透明度，可以直接透出壁纸',
      '深色、浅色、跟随系统三种外观随时切换',
      '自定义强调色会自动派生渐变与光晕'
    ]
  },
  {
    id: 'desktop',
    icon: Bell,
    variant: 'window',
    title: '窗口形态、提醒与托盘',
    description:
      '小组件模式无边框并始终置顶，普通窗口模式带系统标题栏并支持最小化与最大化，切换时会保留全部数据与视图状态。',
    bullets: [
      '到达截止时间会弹出系统通知，错过的提醒会补偿',
      '点关闭按钮只是隐藏到托盘，托盘右键才能退出',
      '按 ' + toggleKey + ' 可以在任意位置显示或隐藏窗口'
    ]
  }
]
