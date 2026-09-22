import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlarmClock, BarChart3, CalendarClock, CheckCheck, Flame, Target } from 'lucide-react'
import { buildTrend, computeListStats, computeStats } from '@shared/utils'
import { Segmented } from '@/components/ui/Controls'
import { SectionCard } from '@/components/ui/SectionCard'
import { useNow } from '@/hooks/useNow'
import { useTodoStore } from '@/store/useTodoStore'

type TrendRange = '7' | '30'

const DAY_OPTIONS: Array<{ value: TrendRange; label: string }> = [
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' }
]

function StatCard({
  icon,
  label,
  value,
  hint,
  tone
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
  tone: string
}) {
  return (
    <div className="glass-card flex flex-col gap-1.5 rounded-card px-3 py-2.5 transition-transform duration-150 hover:-translate-y-[2px]">
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}22`, color: tone }}>
          {icon}
        </span>
        <span className="text-[11px] font-medium text-subtle">{label}</span>
      </div>
      <span className="font-mono text-[19px] font-semibold leading-none tracking-tight text-ink">{value}</span>
      <span className="text-[10.5px] text-subtle">{hint}</span>
    </div>
  )
}

export function StatsView() {
  const items = useTodoStore((state) => state.items)
  const lists = useTodoStore((state) => state.lists)
  const now = useNow(60_000)
  const [days, setDays] = useState<TrendRange>('7')

  const stats = useMemo(() => computeStats(items, lists, now), [items, lists, now])
  const trend = useMemo(() => buildTrend(items, Number(days), now), [items, days, now])
  const listStats = useMemo(() => computeListStats(items, lists), [items, lists])

  const donut = [
    { name: '已完成', value: stats.done, color: 'rgb(var(--accent-rgb))' },
    { name: '未完成', value: stats.active, color: 'rgb(var(--line-rgb) / 0.14)' }
  ]

  // 用主题变量而不是硬编码深色：浅色模式下原本是深底深字，几乎看不清
  const tooltipStyle = {
    background: 'rgb(var(--surface-rgb) / 0.96)',
    border: '1px solid rgb(var(--line-rgb) / 0.16)',
    borderRadius: 12,
    fontSize: 12,
    color: 'rgb(var(--ink-rgb))',
    padding: '6px 10px'
  }
  const tooltipItemStyle = { color: 'rgb(var(--ink-rgb))' }

  // 零任务时不再渲染一堆全零图表，避免出现「110px 高但一根柱都没有」的空壳
  if (stats.total === 0) {
    return (
      <section className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 pt-3">
        <div className="glass-card flex flex-1 flex-col items-center justify-center gap-2 rounded-card px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line/12 bg-line/[0.06] text-subtle">
            <BarChart3 size={20} />
          </span>
          <p className="text-[12.5px] font-medium text-muted">还没有可统计的任务</p>
          <p className="text-[11px] leading-relaxed text-subtle">
            在待办页创建任务并勾选完成后，这里会显示整体完成率、完成趋势与各清单的完成度对比。
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Target size={11} />}
          label="任务总数"
          value={String(stats.total)}
          hint={`其中 ${stats.active} 项进行中`}
          tone="#7C5CFF"
        />
        <StatCard
          icon={<CheckCheck size={11} />}
          label="已完成"
          value={String(stats.done)}
          hint={`完成率 ${stats.completionRate}%`}
          tone="#22C55E"
        />
        <StatCard
          icon={<CalendarClock size={11} />}
          label="今天到期"
          value={String(stats.dueToday)}
          hint="需要今天处理"
          tone="#F59E0B"
        />
        <StatCard
          icon={<Flame size={11} />}
          label="连续完成"
          value={`${stats.streak} 天`}
          hint={stats.streak > 0 ? '保持这个节奏' : '今天完成一项即可开始'}
          tone="#F472B6"
        />
      </div>

      <SectionCard
        title="整体完成率"
        extra={
          stats.overdue > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-pill border border-red-500/40 bg-red-500/12 px-2 py-[2px] text-[10.5px] text-red-400">
              <AlarmClock size={10} /> {stats.overdue} 项逾期
            </span>
          ) : (
            <span className="text-[10.5px] text-emerald-400">暂无逾期任务</span>
          )
        }
      >
        <div className="relative mt-1 h-[132px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donut}
                dataKey="value"
                innerRadius={44}
                outerRadius={58}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                paddingAngle={stats.done > 0 && stats.active > 0 ? 3 : 0}
              >
                {donut.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[22px] font-semibold leading-none text-ink">{stats.completionRate}%</span>
            <span className="mt-1 text-[10.5px] text-subtle">
              {stats.done} / {stats.total} 已完成
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="完成趋势" extra={<Segmented value={days} options={DAY_OPTIONS} onChange={setDays} />}>
        <div className="mt-2 h-[148px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'rgb(var(--subtle-rgb))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'rgb(var(--subtle-rgb))' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
              <Area
                type="monotone"
                dataKey="completed"
                name="完成"
                stroke="rgb(var(--accent-rgb))"
                strokeWidth={2}
                fill="url(#trendFill)"
              />
              <Area
                type="monotone"
                dataKey="created"
                name="新增"
                stroke="rgb(var(--accent-2-rgb))"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="清单完成度对比">
        <div style={{ height: Math.max(110, listStats.length * 34) }} className="mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={listStats} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={64}
                tick={{ fontSize: 11, fill: 'rgb(var(--muted-rgb))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} formatter={(value) => [`${value}%`, '完成率']} />
              <Bar dataKey="rate" radius={[6, 6, 6, 6]} barSize={12} background={{ fill: 'rgb(var(--line-rgb) / 0.08)', radius: 6 }}>
                {listStats.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[10.5px] leading-relaxed text-subtle">
          条体颜色对应清单自定义色，长度表示该清单的完成率；悬停可查看具体数值。
        </p>
      </SectionCard>
    </section>
  )
}
