import { useEffect, useState } from 'react'
import type { AppSettings } from '@shared/types'
import { THEME_PRESETS } from '@shared/constants'

function hexToRgbTriple(hex: string, fallback = '124 92 255'): string {
  const matched = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!matched) return fallback
  const value = parseInt(matched[1], 16)
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`
}

/** 朝白色方向提亮，用于自定义主题生成次级色与光晕色 */
function lighten(hex: string, amount: number): string {
  const matched = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!matched) return hex
  const value = parseInt(matched[1], 16)
  const mix = (channel: number): number => Math.round(channel + (255 - channel) * amount)
  const r = mix((value >> 16) & 255)
  const g = mix((value >> 8) & 255)
  const b = mix(value & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const DARK_TOKENS = {
  surface: '13 18 32',
  ink: '245 247 250',
  muted: '176 186 202',
  subtle: '139 151 172',
  line: '255 255 255'
}

const LIGHT_TOKENS = {
  surface: '250 250 253',
  ink: '26 31 44',
  muted: '86 99 121',
  subtle: '124 137 158',
  line: '15 23 42'
}

export function resolveIsDark(scheme: AppSettings['colorScheme']): boolean {
  if (scheme === 'dark') return true
  if (scheme === 'light') return false
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return true
}

/** 跟随系统时需要监听系统配色变化 */
export function useSystemDark(): boolean {
  const [isDark, setIsDark] = useState(() => resolveIsDark('system'))
  useEffect(() => {
    if (!window.matchMedia) return () => undefined
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent): void => setIsDark(event.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])
  return isDark
}

/** 主题只依赖外观三个字段，收窄入参避免滑块等无关设置变更触发主题重算 */
export type ThemeInput = Pick<AppSettings, 'theme' | 'customAccent' | 'colorScheme'>

/**
 * 把主题设置投影为全局 CSS 变量。
 * 切换配色 / 明暗时只更新根变量，全应用即时联动，不触发组件重排。
 */
export function useTheme(settings: ThemeInput): boolean {
  const systemDark = useSystemDark()
  const isDark = settings.colorScheme === 'system' ? systemDark : settings.colorScheme === 'dark'

  useEffect(() => {
    const preset = THEME_PRESETS.find((item) => item.id === settings.theme) ?? THEME_PRESETS[0]
    const isCustom = settings.theme === 'custom'
    const accent = isCustom ? settings.customAccent : preset.accent
    const accent2 = isCustom ? lighten(settings.customAccent, 0.35) : preset.accent2
    const glow = isCustom ? lighten(settings.customAccent, 0.6) : preset.glow
    const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS
    const root = document.documentElement

    root.style.setProperty('--accent-rgb', hexToRgbTriple(accent))
    root.style.setProperty('--accent-2-rgb', hexToRgbTriple(accent2, '34 211 238'))
    root.style.setProperty('--glow-rgb', hexToRgbTriple(glow, '167 139 250'))
    root.style.setProperty('--surface-rgb', tokens.surface)
    root.style.setProperty('--ink-rgb', tokens.ink)
    root.style.setProperty('--muted-rgb', tokens.muted)
    root.style.setProperty('--subtle-rgb', tokens.subtle)
    root.style.setProperty('--line-rgb', tokens.line)

    root.classList.toggle('scheme-dark', isDark)
    root.classList.toggle('scheme-light', !isDark)
    root.dataset.scheme = isDark ? 'dark' : 'light'
    root.dataset.theme = settings.theme
  }, [settings.theme, settings.customAccent, settings.colorScheme, isDark])

  return isDark
}
