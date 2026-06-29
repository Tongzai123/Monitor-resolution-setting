# 项目规则

## 回复与文档语言

- 默认使用简体中文回复。
- 计划、总结、验收标准、任务说明、风险、备注、提交信息和 PR 描述必须使用简体中文。
- 专有名词、库名、文件名、命令、API 名称和代码符号可保留英文，例如 Electron、React、Win32、`win32-displayconfig`、`npm run dev`。
- 修改项目内已有英文源码注释或上游说明时，保持所在文件原有语言风格；新增面向用户或任务规划的说明优先中文。

## 工作流程

- 开始编码前必须先确认当前 Trellis 任务、读取对应 `prd.md`、`design.md`、`implement.md`。
- 复杂功能必须先规划后实现；分辨率显示与切换功能按 `.trellis/tasks/06-29-resolution-display-switching/` 及其子任务执行。
- 未经明确要求，不启动实现阶段、不运行 `task.py start`、不做源码改动。
- 修改代码前先搜索现有实现，优先复用项目已有模式，不引入割裂的新架构。
- 每次改完主动运行可用验证；无法验证时必须说明原因和残余风险。

## 项目架构约束

- 本项目是 Electron + React 应用，主进程逻辑主要在 `src/electron.js`，显示器枚举/亮度线程在 `src/Monitors.js`，托盘面板在 `src/components/BrightnessPanel.jsx`，设置页在 `src/components/SettingsWindow.jsx`。
- 渲染进程不得直接调用 Node/Electron 原生能力；新增能力应通过 preload 暴露最小 API，再经 IPC 到主进程处理。
- 主进程负责系统能力、窗口、托盘菜单、全局快捷键、设置保存和高风险状态机。
- `Monitors.js` 负责显示器检测与监视器数据合并；不要把 UI 状态混入显示器检测线程。
- 原生 Win32 能力优先扩展现有 `src/modules/win32-displayconfig`，不要在没有充分理由时新增重复 native 模块。

## 分辨率功能专项规则

- 分辨率/刷新率切换必须走 Windows 显示配置 API，不得走 DDC/CI。
- 当前模式读取优先复用 `win32-displayconfig.extractDisplayConfig()` 及现有 Win32 显示器数据。
- 模式枚举和应用需要保留底层精确参数；展示层可以格式化为 `3840x2160 · 60Hz`，但不得用展示字符串作为唯一业务标识。
- 显示器绑定不得只依赖 `DISPLAY1` 或连接顺序；应优先使用设备路径、Win32 配置 ID、EDID 派生信息等稳定字段，并保留降级策略。
- 任何分辨率切换都必须先保存原始模式，并进入主进程维护的确认/回滚流程。
- 自动回滚不能依赖托盘面板是否打开；面板关闭、失焦或隐藏后仍必须继续倒计时。
- 普通切换失败只在面板或通知中提示；自动回滚失败允许弹出系统级对话框。
- 右键菜单和快捷键触发的切换也必须复用同一确认/回滚流程，不能绕过安全机制。

## UI 与交互规则

- 分辨率入口采用类似 Windows 11 快捷设置的分段展开组件：左侧显示当前分辨率/刷新率，右侧小箭头展开模式列表。
- 分辨率组件必须附着在现有显示器卡片中，不做独立大面板，不干扰亮度滑块主流程。
- 模式列表必须把分辨率和刷新率放在同一行展示，当前模式要有明确选中态。
- 列表过长时使用滚动区域；默认避免把所有低价值模式一次性铺满。
- 确认条必须明显，但不能遮挡亮度滑块或破坏面板高度计算。
- 新增 UI 文案必须接入项目本地化体系，不要只硬编码中文或英文。

## 设置、数据和兼容性

- 新增设置字段使用清晰前缀，例如 `resolution*`，避免污染现有亮度、HDR、hotkey、profile 数据结构。
- 设置写入必须通过现有设置保存机制，不直接绕过 `send-settings` / 主进程保存流程。
- 收藏模式按显示器保存；显示器暂时不可用时不要静默删除收藏。
- 虚拟显示器、远程桌面、投屏设备和未知设备要允许降级，不对未知设备自动应用高风险切换。
- 切换前后必须校验目标显示器模式变化，防止多显示器错配。

## 代码质量与安全

- 不为“让功能能跑”而吞异常、注释报错或绕过校验；先定位根因。
- 不把密钥、Token、密码写入代码、日志或任务文档。
- 不修改 `.env`、CI/CD、系统配置、Git 历史，不执行发布、部署、`git push`、`git rebase`、`git reset --hard` 等高风险操作，除非用户明确要求并确认。
- 不删除文件、目录或用户改动，除非用户明确要求。
- 处理文本文件默认使用 UTF-8；遇到乱码先做编码确认，不基于乱码内容推断业务含义。
- 新增脚本只在批量处理、复杂解析或验证必要时使用；优先标准库和项目已有依赖。

## 验证要求

- 前端/打包相关修改至少运行 `npm run parcel-build`，能启动时再用 `npm run dev` 做手工验证。
- 原生模块改动必须验证 rebuild 和运行时加载。
- 分辨率切换相关改动必须手工验证：当前模式读取、模式枚举、切换、确认、自动回滚、面板关闭后回滚、多显示器目标正确性。
- 快捷键和右键菜单改动必须验证不破坏现有亮度快捷键和托盘菜单。

<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
