import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['out/**', 'release/**', 'release-check/**', 'build/**', 'node_modules/**']
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    rules: {
      // 下划线前缀表示「有意不使用」，例如 contextBridge 里占位的回调参数
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],
      // 允许用 void 显式标记「有意忽略的 Promise」，本仓库大量使用该写法
      'no-void': 'off'
    }
  },

  {
    // 渲染层：浏览器环境 + React Hooks 规则
    // exhaustive-deps 是这套配置里最有价值的一条——它正是本项目此前
    // 「Date.now() 写进 useMemo 却漏了依赖导致计数不刷新」这类 bug 的探测器。
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },

  {
    // 主进程 / 预加载 / 构建脚本：Node 环境
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'scripts/**/*.mjs', '*.config.{ts,js,mjs}'],
    languageOptions: {
      globals: globals.node
    }
  },

  {
    // 共享层同时被两个进程引用，两类全局变量都要放行
    files: ['src/shared/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },

  {
    // 根目录的 tailwind/postcss 配置是 CJS（package.json 没有声明 "type": "module"），
    // require() 在这里是唯一可行写法，属于既定约定，不是漏改的 ESM 迁移
    files: ['*.config.js', '*.config.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
)
