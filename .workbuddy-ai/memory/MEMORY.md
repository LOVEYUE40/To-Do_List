# 待办小组件 — 项目长期约定

Electron 31 + React 18 + TypeScript 5.6(strict) + Zustand 4.5.7 + Tailwind 3.4 + electron-vite 2.3。
三进程结构：`src/main`（10 文件）/ `src/preload` / `src/renderer/src`，共享层 `src/shared`
（经 `@shared` 别名）。渲染层用 `@` 指向 `src/renderer/src`。

## 代码风格（务必遵守，仓库是手写格式）

- **不写分号**、单引号、2 空格缩进
- 注释写**中文**，且解释「为什么」而不是「做了什么」
- Prettier 配置已就位（`semi:false, singleQuote:true, printWidth:120, tabWidth:2,
  trailingComma:"none", arrowParens:"always", endOfLine:"lf"`），
  但**尚未全量 `prettier --write`**——要做请单独开一个 commit，别混进功能改动。

## 常用命令

- `npm run typecheck` — 跑 `tsconfig.node.json` + `tsconfig.web.json` 两套
  （根 `tsconfig.json` 是 solution 文件，只给编辑器用）
- `npm run lint` / `npm test` / `npm run build`
- `npm run package` / `npm run release` — **打包前必须先完全退出应用**，
  否则 `resources/app.asar` 被占用，electron-builder 会报
  `The process cannot access the file because it is being used by another process`
  （见历史 `pack.log`）
- 单测：`src/**/*.test.ts`，vitest（**锁 ^3**，vitest 5 要 vite 6+）

## API 坑（踩过，别再踩）

- `useShallow` 在 zustand 4.x 是 **`zustand/react/shallow`**，不是 `zustand/shallow`
- 渲染层**不能**用 Node 全局（`process` / `__dirname` / `require`）——
  `tsconfig.web.json` 里 `types: []`，用了就报错，这是有意设计
- CSP 只在 `app.isPackaged` 注入；dev 下加 CSP 必挂（Vite 内联 preamble + HMR）。
  `style-src` 必须含 `'unsafe-inline'`（全项目大量 React 内联 `style={{}}`）
- 构建别名在 `electron.vite.config.ts` 里显式声明，**不**依赖 tsconfig paths
- 布尔值归一化一律用 `src/shared/utils.ts` 的 `toBoolean()`，不要用 `Boolean()`
  （`Boolean('false') === true`）

## 安全约定

- IPC 入参必须在主进程白名单/规范化后再落盘。`settings:set` 走
  `normalizeSettings({...previous, ...merged})`，`data:save` 走
  `normalizeListsPatch` / `normalizeItemsPatch`（**先 lists 后 items**，
  因为 items 需要正确的 `fallbackListId`）
- 写盘用原子写：唯一 tmp 名（`${filePath}.${pid}.${seq}.tmp`）+ `rename`

## 架构决策（已评估后决定「不做」）

- **不做**任务列表虚拟化：窗口 340×430 只显示 5-6 行，且 @dnd-kit 可排序列表
  配虚拟化很脆，收益低复杂度高
- **不把** React 等渲染层依赖挪进 `dependencies`：它们已被打包进 bundle，
  挪过去只会让 asar 里出现重复代码、安装包变大
- **不在** `unhandledRejection` 里刷盘
- 工作区文件夹名 `AI新闻推送` 是历史遗留，与项目无关，不需要补 AI/新闻功能
