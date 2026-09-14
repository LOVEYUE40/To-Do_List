import { useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  ChevronDown,
  Database,
  Keyboard,
  LayoutList,
  LifeBuoy,
  ListChecks,
  Monitor,
  Palette,
  PanelTop,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { HelpSystemCard } from '@/components/help/HelpSystemCard'
import { formatShortcut } from '@/lib/format'
import { useSettingsStore } from '@/store/useSettingsStore'

const SECTIONS = [
  { id: 'help-quickstart', label: '快速上手', icon: Sparkles },
  { id: 'help-tasks', label: '任务与清单', icon: ListChecks },
  { id: 'help-reminder', label: '提醒与通知', icon: Bell },
  { id: 'help-appearance', label: '外观与透明', icon: Palette },
  { id: 'help-window', label: '窗口与托盘', icon: PanelTop },
  { id: 'help-shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'help-data', label: '数据与备份', icon: Database },
  { id: 'help-system', label: '系统要求', icon: Monitor },
  { id: 'help-faq', label: '常见问题', icon: LayoutList }
]

function HelpCard({
  id,
  icon,
  title,
  children
}: {
  id: string
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="glass-card scroll-mt-2 rounded-card p-3">
      <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
        <span className="text-accent">{icon}</span>
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-[6px]">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent/85" />
          <span className="text-[11.5px] leading-[1.65] text-muted">{item}</span>
        </li>
      ))}
    </ul>
  )
}

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: '窗口背景变成黑底或出现花屏？',
    a: '个别显卡驱动对透明窗口的兼容性较差。进入「设置 → 系统集成 → 禁用硬件加速」开启后重启应用即可，该设置需要重启才会生效。'
  },
  {
    q: '全局快捷键没有反应？',
    a: '组合键可能被系统或其他应用占用，主进程日志会记录注册失败的组合键。在「设置 → 全局快捷键」中点击按钮后按下新的组合键即可重新录制，建议使用 Ctrl + Alt 系列组合。'
  },
  {
    q: '点了关闭按钮，应用不见了？',
    a: '小组件默认「关闭即隐藏到系统托盘」，并不是退出程序。在托盘图标上右键选择「退出」才会真正结束进程，也可以在「设置 → 系统集成」中点击退出按钮。'
  },
  {
    q: '切换窗口形态时会闪一下？',
    a: '这是预期行为。透明与无边框属于窗口创建期参数，运行时无法修改，只能重建窗口，重建过程约 100~200ms，随后内容会带淡入动画恢复，数据与视图状态都不会丢失。'
  },
  {
    q: '数据会不会丢？',
    a: '写盘采用「临时文件 + 重命名」的原子方式，导入与清空前都会自动生成备份（最多保留 5 份）。也可以在「数据」页随时导出 JSON 做离线备份。'
  },
  {
    q: '自动更新提示仓库不可访问？',
    a: 'electron-updater 无法匿名读取私有仓库的 Release。请将仓库设为公开，或在打包时改用带访问令牌的更新源。'
  }
]

function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="flex flex-col gap-1.5">
      {FAQ_ITEMS.map((item, index) => {
        const open = openIndex === index
        return (
          <div key={item.q} className="overflow-hidden rounded-xl border border-line/10 bg-line/[0.04]">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 hover:bg-line/[0.07]"
            >
              <span className="text-[12px] font-medium text-ink">{item.q}</span>
              <ChevronDown
                size={13}
                className={cn('shrink-0 text-subtle transition-transform duration-200', open && 'rotate-180')}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-200 ease-out',
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <p className="overflow-hidden px-3 pb-2.5 text-[11.5px] leading-[1.7] text-muted">{item.a}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HelpView() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(SECTIONS[0].id)
  const shortcuts = useSettingsStore((state) => state.settings.shortcuts)

  const jumpTo = (id: string): void => {
    setActive(id)
    const container = scrollRef.current
    if (!container) return
    const target = container.querySelector(`#${id}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleScroll = (): void => {
    const container = scrollRef.current
    if (!container) return
    const line = container.scrollTop + 48
    let current = SECTIONS[0].id
    for (const section of SECTIONS) {
      const element = container.querySelector(`#${section.id}`) as HTMLElement | null
      if (element && element.offsetTop - container.offsetTop <= line) current = section.id
    }
    if (current !== active) setActive(current)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <h2 className="flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-ink">
          <LifeBuoy size={15} className="text-accent" />
          帮助中心
        </h2>
        <p className="mt-0.5 text-[11px] text-subtle">功能说明、快捷键速查与系统要求，随时可以回看新手引导。</p>
      </div>

      <div className="scroll-thin shrink-0 overflow-x-auto px-3 pb-2">
        <div className="flex w-max items-center gap-1.5">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const on = active === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpTo(section.id)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-[5px]',
                  'text-[11.5px] font-medium transition-all duration-150 ease-out',
                  on
                    ? 'border-transparent text-white'
                    : 'border-line/12 bg-line/[0.05] text-muted hover:border-line/25 hover:text-ink'
                )}
                style={
                  on
                    ? { background: 'linear-gradient(120deg, rgb(var(--accent-rgb)), rgb(var(--accent-2-rgb)))' }
                    : undefined
                }
              >
                <Icon size={11} />
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-2.5">
          <HelpCard id="help-quickstart" icon={<Sparkles size={13} />} title="快速上手">
            <Bullets
              items={[
                '在待办页底部输入框输入标题后按回车，任务会立即创建在当前清单中。',
                '点击任务左侧的方块勾选完成，点击标题可以打开编辑弹窗补充备注、标签与截止时间。',
                '顶部工具条可以按状态与优先级筛选，并按手动、创建时间、截止时间、优先级或标题排序。',
                '左侧「智能视图」自动聚合全部、今天到期、已逾期与已完成；「我的清单」可以自由新建与删除。',
                '需要重新看一遍引导，可在设置页点击「重新查看新手引导」。'
              ]}
            />
          </HelpCard>

          <HelpCard id="help-tasks" icon={<ListChecks size={13} />} title="任务与清单">
            <Bullets
              items={[
                '任务支持备注、最多 12 个标签、四档优先级与截止时间。',
                '删除任务后底部会出现提示条，点击「撤销」即可恢复；「清空已完成」会批量清理当前清单的已完成任务。',
                '手动排序模式下，鼠标悬停任务左侧会出现拖动手柄，按住即可调整顺序。',
                '搜索框同时匹配标题、备注与标签，输入即筛，无需回车。'
              ]}
            />
          </HelpCard>

          <HelpCard id="help-reminder" icon={<Bell size={13} />} title="提醒与通知">
            <Bullets
              items={[
                '在编辑弹窗中设置截止时间后，可开启「到期提醒」并选择提前 5 分钟到 1 天之间的提醒时机。',
                '提醒由主进程统一调度，即使窗口被隐藏也会正常弹出系统通知。',
                '应用休眠或退出期间错过的提醒，会在恢复后自动补偿推送。',
                '每条任务的提醒只会触发一次，不会重复打扰。'
              ]}
            />
          </HelpCard>

          <HelpCard id="help-appearance" icon={<Palette size={13} />} title="外观与透明">
            <Bullets
              items={[
                '「整体不透明度」控制整个窗口（含文字）的透明程度，数值越低越能透出桌面内容。',
                '「玻璃底色浓度」决定面板自身底色的厚度，调低会显得更通透。',
                '「毛玻璃模糊」强度越高，玻璃质感越明显，同时对显卡的开销也略高。',
                '内置六套配色方案，也可以自定义强调色，系统会自动派生渐变与光晕。'
              ]}
            />
          </HelpCard>

          <HelpCard id="help-window" icon={<PanelTop size={13} />} title="窗口与托盘">
            <Bullets
              items={[
                '小组件模式：无边框、背景透明、始终置顶、不占用任务栏，适合当作桌面便签。',
                '普通窗口模式：带系统标题栏，支持最小化与最大化，适合专注处理任务。',
                '两种形态一键互切，切换后会重新加载窗口，但数据与视图状态都会保留。',
                '托盘菜单提供显示/隐藏窗口、快速新增、切换视图、切换形态与退出。'
              ]}
            />
          </HelpCard>

          <HelpCard id="help-shortcuts" icon={<Keyboard size={13} />} title="快捷键速查">
            <div className="divide-y divide-line/8 rounded-xl border border-line/10 bg-line/[0.04] px-3">
              {[
                { label: '显示 / 隐藏窗口', key: formatShortcut(shortcuts.toggle) },
                { label: '快速新增任务', key: formatShortcut(shortcuts.quickAdd) },
                { label: '提交快速新增', key: 'Enter' },
                { label: '取消当前输入 / 关闭弹窗', key: 'Esc' },
                { label: '引导内切换步骤', key: '← / →' }
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-[7px]">
                  <span className="text-[12px] text-muted">{row.label}</span>
                  <span className="rounded-md border border-line/14 bg-line/[0.07] px-1.5 py-[1px] font-mono text-[11px] text-ink">
                    {row.key}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-subtle">
              全局快捷键可在「设置 → 全局快捷键」中点击按钮后按下新的组合键重新录制。
            </p>
          </HelpCard>

          <HelpCard id="help-data" icon={<Database size={13} />} title="数据与备份">
            <Bullets
              items={[
                '全部数据保存在系统用户目录下的 todo-data.json，采用原子写入避免出现半截文件。',
                '「数据」页可以导出为 JSON 备份，也可以导入此前导出的文件，导入前会自动备份当前数据。',
                '清空数据会删除全部任务，但保留清单结构与外观设置，且同样会先生成备份。',
                '历史备份最多保留 5 份，可在数据页点击「打开数据目录」查看。'
              ]}
            />
          </HelpCard>

          <HelpCard id="help-system" icon={<Monitor size={13} />} title="系统要求与兼容性">
            <HelpSystemCard />
          </HelpCard>

          <HelpCard id="help-faq" icon={<LayoutList size={13} />} title="常见问题">
            <FaqList />
          </HelpCard>

          <Button
            variant="outline"
            block
            icon={<Sparkles size={12} />}
            onClick={() => useSettingsStore.getState().openGuide()}
          >
            重新查看新手引导
          </Button>
        </div>
      </div>
    </section>
  )
}
