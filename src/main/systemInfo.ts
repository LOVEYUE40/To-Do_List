import { app } from 'electron'
import os from 'node:os'
import type { AppInfo } from '@shared/types'

/** Windows 10 与 Windows 11 共用内核主版本号 10，以内部版本号区分 */
const WINDOWS_11_MIN_BUILD = 22000

/** 把 os.release() 翻译成用户能看懂的系统名称 */
function describeOs(osRelease: string, platform: string): string {
  if (platform !== 'win32') return `${platform}（内核 ${osRelease}）`

  const [majorRaw, minorRaw, buildRaw] = osRelease.split('.')
  const major = Number(majorRaw)
  const minor = Number(minorRaw)
  const build = Number(buildRaw)

  if (major === 10) {
    return build >= WINDOWS_11_MIN_BUILD
      ? `Windows 11（内部版本 ${build}）`
      : `Windows 10（内部版本 ${build}）`
  }
  if (major === 6 && minor === 3) return 'Windows 8.1'
  if (major === 6 && minor === 2) return 'Windows 8'
  if (major === 6 && minor === 1) return 'Windows 7'
  if (major === 6 && minor === 0) return 'Windows Vista'
  if (major === 5) return 'Windows XP / Server 2003'
  return `Windows（内核 ${osRelease}）`
}

/**
 * 兼容性判定口径与 README 保持一致：
 * 仅 Windows 10（内核 10.x）/ Windows 11 的 64 位环境受支持。
 * 判定失败不抛错，统一降级为「不受支持 + 可读原因」。
 */
function judgeSupport(
  platform: string,
  arch: string,
  osRelease: string
): { supported: boolean; supportHint: string } {
  if (platform !== 'win32') {
    return { supported: false, supportHint: `当前运行在 ${platform} 上，本应用仅提供 Windows 版本。` }
  }
  if (arch !== 'x64' && arch !== 'arm64') {
    return { supported: false, supportHint: `当前为 ${arch} 架构，本应用仅提供 64 位（x64）构建。` }
  }

  const major = Number(osRelease.split('.')[0])
  if (!Number.isFinite(major) || major < 10) {
    return {
      supported: false,
      supportHint:
        `系统内核版本为 ${osRelease}，低于 Windows 10。` +
        '本应用基于 Electron 31 运行时，其官方最低系统要求为 Windows 10，' +
        '因此在 Windows 7 / 8 / 8.1 上无法运行。'
    }
  }

  return { supported: true, supportHint: '' }
}

export function getAppInfo(): AppInfo {
  const osRelease = os.release()
  const platform = process.platform
  const arch = process.arch
  const judgement = judgeSupport(platform, arch, osRelease)

  return {
    version: app.getVersion(),
    platform,
    arch,
    osRelease,
    osVersion: describeOs(osRelease, platform),
    supported: judgement.supported,
    supportHint: judgement.supportHint,
    isPackaged: app.isPackaged,
    electron: process.versions.electron ?? 'unknown',
    chrome: process.versions.chrome ?? 'unknown'
  }
}
