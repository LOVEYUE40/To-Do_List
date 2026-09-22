import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    // 目前测试只覆盖 shared 里的纯逻辑，不需要 DOM 环境
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
