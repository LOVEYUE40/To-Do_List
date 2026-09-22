# 待办小组件（Todo Widget）

一款运行在 Windows 桌面上的**磨砂玻璃质感待办应用**。默认以「桌面小组件」形态常驻桌面——无边框、可拖动、可缩放、始终置顶，并且**整窗透明度可自由调节**，可以直接透出桌面壁纸或正在工作的窗口；同时提供**六套预设配色 + 自定义取色**，一键即可换装。

技术栈：Electron 31 + electron-vite + React 18 + TypeScript + Tailwind CSS + Zustand + Recharts + dnd-kit + electron-updater。

---

## 系统要求

| 项目 | 要求 |
| --- | --- |
| 操作系统 | **Windows 10（1809 及以上）/ Windows 11** |
| 架构 | **64 位（x64）** |
| 运行环境 | 无需额外依赖，安装包自带运行时 |

> **Windows 7 / 8 / 8.1 不受支持。** 本应用基于 Electron 31 运行时，其官方最低系统要求即为 Windows 10；虽然应用使用的透明窗口、托盘、通知、无边框等能力在 Win7 时代就已存在，但受运行时限制无法在这些系统上启动。若必须支持 Win7，需要将 Electron 降级到 22.x 并放弃后续安全更新。
>
> 应用内「帮助中心 → 系统要求与兼容性」会实时显示当前系统的版本、架构与受支持判定。

---

## 快速开始

```bash
npm install      # 安装依赖（Electron 二进制约 150MB，仓库已配置国内镜像加速）
npm run dev      # 开发模式：启动渲染层 dev server 并拉起 Electron 窗口
```

构建与打包：

```bash
npm run build              # 构建三端产物到 out/
npm run preview            # 以生产产物启动应用
npm run package            # 打包为 Windows NSIS 安装包（输出到 release/）
npm run release            # 打包并发布到 GitHub Releases（需要 GH_TOKEN）
npm run typecheck          # 全量类型检查
```

> 若 `npm install` 后 Electron 二进制缺失（npm 11 会拦截 postinstall 脚本），执行：
> `$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"; node node_modules/electron/install.js`

---

## 新手引导与帮助中心

- **首次启动**会自动弹出五步引导向导，依次介绍：欢迎与整体形态、三步记住一件事、清单与筛选排序、外观与透明度、窗口形态与提醒托盘。
- 引导支持上一步 / 下一步 / 跳过，也可以用键盘 `←` `→` 切换、`Esc` 直接结束。
- 结束或跳过后写入 `guideVersion`，之后不再自动弹出；需要回看时可在「设置 → 使用引导 → 重新查看新手引导」重新打开。
- **帮助中心**（底部「帮助」标签，或托盘菜单「帮助中心」）提供九个章节的图文说明：快速上手、任务与清单、提醒与通知、外观与透明、窗口与托盘、快捷键速查、数据与备份、系统要求与兼容性、常见问题。顶部胶囊按钮可平滑跳转到任意章节。
- 引导插画使用 CSS 变量绘制，切换主题色板或明暗外观时会自动跟随，不引入额外图片资源。

---

## 自动更新

更新基于 **electron-updater + GitHub Releases**：

- 应用启动约 8 秒后静默检查一次更新（可在「设置 → 关于与更新」关闭「自动检查更新」）。
- 发现新版本时显示版本号与更新说明，**由你确认后**才开始下载，下载过程显示百分比与已传输体积。
- 下载完成后按钮变为「重启并安装」，点击即退出并完成替换。
- 也可随时点击「检查更新」手动触发，或点「查看发布页」在浏览器中打开发布列表。

### 发版流程

1. 修改 `package.json` 中的 `version`（语义化版本，例如 `1.2.0`）。
2. 提交并打标签：`git tag v1.2.0 && git push origin v1.2.0`。
3. GitHub Actions（`.github/workflows/release.yml`）会自动构建并把安装包、`latest.yml`、`.blockmap` 发布到 Releases。
4. 已安装旧版本的用户下次启动即可收到更新提示。

也可以本地发布：设置 `GH_TOKEN` 环境变量后执行 `npm run release`。

### 两个前置条件

- **仓库必须是公开的**。electron-updater 无法匿名读取私有仓库的 Release 资源；若仓库为私有，需要改用带访问令牌的更新源。
- 安装包**未做代码签名**，安装时会触发 Windows SmartScreen 提示，属正常现象。如需消除提示，请自行配置代码签名证书。

---

## 功能一览

### 任务管理
- 新建、编辑、删除任务，勾选完成，一键清空已完成，删除后可在提示条中撤销恢复
- 任务包含标题、备注、优先级、标签、截止时间与到期提醒

### 组织能力
- **多清单**：内置收集箱 / 工作 / 生活，可自由新建与删除，清单拥有独立自定义色
- **智能视图**：全部任务、今天到期、已逾期、已完成
- **筛选**：按状态（全部 / 进行中 / 已完成 / 今天 / 逾期）与优先级
- **排序**：手动、创建时间、截止时间、优先级、标题
- **搜索**：标题、备注、标签全文匹配；**拖拽排序**：手动模式下按住左侧手柄拖动

### 时间与提醒
- 截止时间使用原生日期时间选择器，可开启「到期提醒」并选择提前 5 分钟 ~ 1 天
- 提醒由**主进程调度 + 系统通知**弹出，休眠或退出期间错过的提醒会在恢复后补发，并通过 `notified` 标记做幂等去重

### 外观自定义
- **整体不透明度**（30% ~ 100%）、**玻璃底色浓度**、**毛玻璃模糊**（0 ~ 28px）三条滑块独立可调
- **六套配色**：极光紫青、深海蓝、樱花粉、森林绿、日落橙红、暖纸，另支持任意自定义强调色
- **明暗外观**：深色 / 浅色 / 跟随系统；**低透明度可读性增强**自动加深底色与描边

### 窗口形态
- **桌面小组件模式**：无边框、透明、始终置顶、跳过任务栏
- **普通窗口模式**：带系统标题栏，可最小化 / 最大化
- 一键互切，切换时重建窗口但数据与视图状态全部保留

### 桌面集成
- **系统托盘**：显示/隐藏、快速新增、切换视图、切换形态、帮助中心、退出
- **全局快捷键**：默认 `Ctrl + Alt + T` 显示/隐藏、`Ctrl + Alt + N` 快速新增（可自行录制）
- **开机自启**：设置页一键开启

### 数据管理
- 本地 JSON 持久化，「临时文件 + 重命名」**原子写入**
- 导出 / 导入 JSON（导入前做结构校验与条数上限检查，并自动备份）
- 支持导出 Excel 任务报表（.xlsx，含「任务」「清单」两个工作表，适合在 Excel / WPS 中查看统计）
- 一键清空全部任务（保留清单与外观设置，清空前自动备份），历史备份最多保留 5 份
- 数据文件位于 `%APPDATA%\todo-widget\todo-data.json`

### 统计视图
- 任务总数、已完成、今天到期、连续完成天数四张概览卡
- 整体完成率环形图、近 7 / 30 天完成趋势面积图、各清单完成度对比条形图

---

## 目录结构

```
To-Do_List/
├── .github/workflows/release.yml   # v* 标签触发的自动发版工作流
├── .gitattributes                  # 统一行尾，避免 CRLF 噪声
├── LICENSE                         # MIT
├── electron.vite.config.ts         # 主进程 / 预加载 / 渲染层三端构建配置
├── electron-builder.yml            # NSIS 打包 + GitHub Releases 发布配置
├── tailwind.config.js              # 主题色令牌、动画与阴影
└── src/
    ├── shared/                     # 三端共享：类型契约、常量、纯函数
    │   ├── types.ts                # TodoItem / AppSettings / AppInfo / UpdateStatus / DesktopApi
    │   ├── constants.ts            # IPC 通道名、预设色板、默认设置、支持范围声明
    │   └── utils.ts                # 筛选排序、统计、趋势、导入校验、设置规范化
    ├── main/                       # 主进程
    │   ├── index.ts                # 生命周期、单实例、启动期设置
    │   ├── windowManager.ts        # 透明窗口创建、形态重建、bounds 记忆、显示兜底
    │   ├── store.ts                # JSON 防抖原子写、备份、导入导出
    │   ├── ipc.ts                  # IPC handler 白名单与参数校验
    │   ├── updater.ts              # electron-updater 封装：状态机、进度节流、启动静默检查
    │   ├── systemInfo.ts           # 系统版本与受支持判定
    │   ├── reminders.ts            # 提醒轮询、错过补偿、系统通知
    │   ├── tray.ts                 # 托盘图标与右键菜单
    │   ├── shortcuts.ts            # 全局快捷键注册与冲突处理
    │   └── assets.ts               # 纯代码生成 PNG 图标（无二进制资源）
    ├── preload/index.ts            # contextBridge 暴露受限桌面 API
    └── renderer/src/
        ├── App.tsx                 # 玻璃外壳、视图路由、Toast、引导挂载
        ├── store/                  # Zustand：任务状态、设置状态
        ├── hooks/                  # useTheme / useReminder / useDesktopEvents / useNow
        ├── components/guide/       # 新手引导向导与插画
        ├── components/help/        # 帮助中心系统要求卡片
        ├── components/views/       # 待办 / 统计 / 数据 / 设置 / 帮助 五个页面
        ├── components/settings/    # 主题画廊、系统面板、更新面板、快捷键录制
        ├── components/layout/      # 标题栏、清单侧边栏、底部视图栏
        └── components/ui/          # Button / Field / Controls / Modal 基础组件
```

---

## 实现要点

- **三层解耦**：主进程负责窗口、数据与系统能力；预加载层通过 `contextBridge` 暴露白名单 IPC；渲染层只做 UI，不接触 Node。
- **安全基线**：`contextIsolation: true`、`nodeIntegration: false`、`webSecurity` 保持开启；外链打开仅放行 `https` + `github.com`。
- **整窗透明**：窗口使用 `frame: false` + `transparent: true` + `backgroundColor: '#00000000'`；「整体不透明度」由渲染层根容器 CSS `opacity` 实现（透明窗口下 `win.setOpacity()` 在 Windows 上不可靠），玻璃底色用 `rgb(... / alpha)` 单独控制。
- **形态切换必须重建窗口**：`frame` 与 `transparent` 是创建期参数，运行时修改无效，因此切换前先落盘窗口 bounds，再销毁并按新模式重建。
- **引导状态落主进程**：窗口重建后渲染层内存态会丢失，只有持久化的 `guideVersion` 能可靠避免引导反复弹出。
- **更新模块 `isPackaged` 守卫**：开发环境不发起任何网络请求，只返回「未启用」状态。
- **性能**：Zustand 细粒度选择器 + 任务项 `memo`；筛选/排序/统计用 `useMemo` 记忆化；渲染层 200ms + 主进程 300ms 双层写盘防抖；下载进度按 200ms 节流后再推送到界面。

---

## 常见问题

**窗口出现黑底 / 花屏？**
进入「设置 → 系统集成 → 禁用硬件加速」开启后重启应用（需重启生效）。

**全局快捷键没反应？**
组合键可能被系统或其他应用占用，主进程日志会记录失败的组合键。在「设置 → 全局快捷键」中点击按钮后按新的组合键即可重新录制。

**点击关闭按钮后应用不见了？**
小组件默认「关闭即隐藏到系统托盘」。托盘图标右键 →「退出」才会真正结束进程。

**数据会丢吗？**
写盘采用原子写入，导入与清空前都会自动备份。也可以在「数据」页随时导出 JSON 做离线备份。

**更新时提示仓库不可访问？**
electron-updater 无法匿名读取私有仓库的 Release，请将仓库设为公开。

---

## 推送到 GitHub

仓库地址：`https://github.com/LOVEYUE40/To-Do_List`

```bash
git init -b main
git remote add origin git@github.com:LOVEYUE40/To-Do_List.git
git add -A
git commit -m "feat: 桌面待办小组件 1.1.0"
git push -u origin main
```

推送前请确认本机 SSH Key 已配置并添加到 GitHub 账号：

```bash
ssh -T git@github.com          # 应返回 "Hi <用户名>! You've successfully authenticated"
ssh-keygen -t ed25519 -C "your@email.com"   # 若尚未生成密钥
```

---

## 许可证

[MIT](./LICENSE)
