# 分辨率完整首版集成验收记录

## 当前状态

- 记录时间：2026-06-29
- 当前实现已覆盖底层枚举/切换接口、主面板入口、设置项、收藏、托盘右键菜单和快捷键 action 接入，并补充了切换半成功但目标校验失败时的安全恢复兜底。
- 端到端运行、真实显示器切换和自动回滚尚未完成。Windows SDK `10.0.26100.0` 已补齐，原生模块 rebuild 已通过；原中文路径仍会触发 `node-gyp` / MSBuild 路径编码问题，最终 `.exe` 已在 ASCII 临时副本中成功打包。

## 已执行验证

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 主进程语法检查 | `node --check src/electron.js` | 通过 |
| Win32 JS 包装语法检查 | `node --check src/modules/win32-displayconfig/index.js` | 通过 |
| 面板 preload 语法检查 | `node --check src/panel-preload.js` | 通过 |
| 显示器数据层语法检查 | `node --check src/Monitors.js` | 通过 |
| 本地化 JSON 校验 | `node -e "JSON.parse(...en.json); JSON.parse(...zh_Hans.json)"` | 通过 |
| JSX 转译检查 | `@babel/core` + `@babel/preset-react` 转译 `BrightnessPanel.jsx` / `SettingsWindow.jsx` | 通过 |
| 前端构建 | `npm run parcel-build` | 通过，生成 `build/*` |
| 最新前端构建复核 | `npm run parcel-build` | 通过，生成 `build/*`，未生成 `.exe` |
| ASCII 路径前端构建 | 在 `C:\Users\11834\Desktop\code\resolution-build-ascii` 运行 `npm run parcel-build` | 通过 |
| 依赖同步检查 | `npm ci --ignore-scripts --dry-run` | 通过 |
| Windows SDK 检查 | 检查 `Windows Kits\10\Include` / `Windows Kits\10\Lib` | 未找到可用 Include/Lib 目录 |
| `.exe` 产物检查 | `Get-ChildItem -LiteralPath 'dist' -Recurse -Include '*.exe'` | 未发现 `.exe` |
| SDK 安装后复核 | 检查 `D:\Windows Kits\10\Include\10.0.26100.0` / `D:\Windows Kits\10\Lib\10.0.26100.0` | 通过 |
| 原工作区原生模块 rebuild 复核 | `npm run rebuild --prefix src/modules/win32-displayconfig` | 通过，生成 `src/modules/win32-displayconfig/build/Release/win32_displayconfig.node` |
| 原工作区前端构建复核 | `npm run parcel-build` | 通过 |
| 原工作区 Electron 打包 | `npm run electron-build` | 失败：中文路径下 `src/modules/node-ddcci` rebuild 触发 `node-gyp` / Python `gbk` 解码错误；设置 UTF-8 后仍因中文路径生成的 `binding.sln` 被 MSBuild 判定解析失败 |
| ASCII 路径源码同步 | `robocopy ... resolution-build-ascii ...` | 通过，已同步最新源码到 `C:\Users\11834\Desktop\code\resolution-build-ascii` |
| ASCII 路径原生模块 rebuild | `npm run rebuild --prefix src/modules/win32-displayconfig` | 通过 |
| ASCII 路径前端构建 | `npm run parcel-build` | 通过 |
| ASCII 路径 Electron 打包 | `npm run electron-build` | 通过，生成 NSIS `.exe` |
| ASCII 路径 `.exe` 产物检查 | `Get-ChildItem ...\resolution-build-ascii\dist -Recurse -Include *.exe` | 通过，发现安装包和 unpacked 可执行文件 |
| 安装包入口校验 | 读取 `dist\win-unpacked\resources\app.asar/package.json` | 通过，`main` 为 `src/electron.js`，且 asar 内存在 `src/electron.js` |
| 安装后自动启动规避 | `package.json` 的 `build.nsis.runAfterFinish=false` 后重新打包 | 通过，安装器不再在完成页自动启动应用，避免安装过程中文件落盘/旧状态导致主进程弹错 |
| 生产环境 package 读取修复 | 将 `src/electron.js` 中生产环境读取 `../package.json` 改为 `path.join(__dirname, "../package.json")` | 通过，避免字符串拼接路径在 asar 环境中落到 `resources\package.json` 外部路径 |
| Unpacked 运行验证 | 启动 `dist\win-unpacked\Twinkle Tray.exe --show-console` 并等待 6 秒 | 通过，进程保持运行，未复现 `resources\index.js` 主进程入口错误 |
| 生产环境 package 读取二次修复 | 生产环境不再读取 `../package.json`，仅开发模式读取根 `package.json`，生产版本使用 `app.getVersion()` | 通过，彻底避免安装目录缺少外部 `resources\package.json` 时触发 Electron 入口回退到 `index.js` |
| 安装后启动验证 | 使用最新安装包 `/S` 静默安装，再启动 `C:\Users\11834\AppData\Local\Programs\twinkle-tray\Twinkle Tray.exe --show-console` | 通过，安装退出码 `0`，启动未复现 `resources\index.js` 主进程错误 |
| 桌面启动错误复现 | 清空 `Twinkle Tray.exe` 进程后启动 `C:\Users\11834\AppData\Local\Programs\twinkle-tray\Twinkle Tray.exe` 并抓取屏幕 | 复现旧包错误：`Cannot find module ...\node_modules\@paymoapp\active-window\dist\index.js` |
| `active-window` 入口修复 | `npm run build:ts --prefix src/modules/node-active-window` | 通过，生成 `dist/index.js`，无 TypeScript 报错 |
| 修复后 ASCII 路径前端构建 | 在 `C:\Users\11834\Desktop\code\resolution-build-ascii` 运行 `npm run parcel-build` | 通过 |
| 修复后 ASCII 路径 Electron 打包 | 在 `C:\Users\11834\Desktop\code\resolution-build-ascii` 运行 `npm run electron-build` | 通过，生成新的 NSIS `.exe` |
| 修复后安装目录依赖检查 | 检查 `resources\app.asar.unpacked\node_modules\@paymoapp\active-window\dist\index.js` 和 `build\Release\PaymoActiveWindow.node` | 通过，两个运行时必需文件均存在 |
| 修复后桌面启动验证 | 清空 `Twinkle Tray.exe` 进程后启动安装目录 exe 并抓屏 | 通过，出现正常 `Hello, Twinkle Tray!` 首次启动窗口，未再出现 JavaScript Error |

## 已补充的风险修正

- `resolutionShowAllModes=false` 时，模式去重现在只按分辨率和刷新率整理；开启全部模式时才保留 `bitsPerPel`、`displayFlags`、`fixedOutput` 等底层字段差异。
- 从热键 action 的“切换分辨率”切回普通亮度/VCP action 时，会把残留 `target: "resolution"` 重置为 `brightness`，避免被误当成 VCP 代码执行。
- 收藏模式兼容旧字符串格式，同时新收藏保存完整模式对象，包含 `bitsPerPel`、`displayFlags`、`fixedOutput` 等底层参数；右键菜单和快捷键会优先用完整参数匹配真实 Windows 模式。
- 原生 `setDisplayMode` 入参读取改为显式 `Uint32Value()`，避免 N-API number 到 Win32 `DWORD` 的隐式转换风险。
- 主进程统一切换入口会拒绝在已有待确认分辨率变更时再次切换，避免第二次切换覆盖第一次的安全回滚点；面板错误提示已接入本地化文案。
- “保留更改”确认动作会再次调用 `setDisplayMode(... persistent: true)` 持久化目标模式，成功后才清除 pending 状态；确认持久化失败会返回错误，用户仍可还原。
- 面板收到设置更新时会同步刷新已展开分辨率列表的收藏状态，避免设置页或其他窗口改动收藏后，面板显示旧收藏状态。
- `resolutionShowAllModes` 现在会传递到原生 `EnumDisplaySettingsExW` 的 `EDS_RAWMODE` 标志，设置开启时枚举 Windows 原始模式；默认关闭时仍使用整理后的常规模式列表。
- 应用分辨率模式时会保留并传递枚举得到的 `fixedOutput`，设置 `DM_DISPLAYFIXEDOUTPUT`，避免 RAW/全部模式或收藏模式丢失底层固定输出参数。
- 面板低刷新率过滤不会隐藏当前模式，确保当前模式在“隐藏低刷新率”和“只显示收藏”同时开启时仍保留在列表中。
- 右键菜单和快捷键触发收藏模式时，必须先在当前 Windows 枚举模式中找到匹配项；收藏模式当前不可用时返回错误，不再用收藏对象拼出近似模式继续切换。
- 面板收藏星标、收藏分组和“只显示收藏”会对对象收藏执行精确匹配，包含 `bitsPerPel`、`displayFlags`、`fixedOutput`；旧字符串收藏仍按宽高刷新率兼容。
- 设置页快捷键模式下拉会为对象收藏生成包含 `bitsPerPel`、`displayFlags`、`fixedOutput` 的精确 value，避免同宽高同刷新率的收藏项冲突；主进程执行时同时兼容旧短 key。
- 设置页打开旧快捷键配置时，会把已保存的短收藏 key 映射到当前收藏项的精确 option value，避免下拉框无选中项。
- 面板在开启“显示所有 Windows 模式”时，会在重复模式标签中追加底层参数摘要，并用包含 `bitsPerPel`、`displayFlags`、`fixedOutput`、`modeIndex` 的 React key，避免 RAW 模式难以区分或列表 key 冲突。
- pending 状态同时保存用户请求的完整 `requestedMode` 和应用后的 `targetMode`；“保留更改”持久化时使用 `requestedMode`，避免确认阶段丢失 `bitsPerPel`、`displayFlags`、`fixedOutput` 等底层参数。
- 面板和设置页显示器选择使用 `resolutionDisplayKey -> win32DevicePath -> key` 降级策略，不再硬性要求 `resolutionDisplayKey` 存在。
- 分辨率切换如果在底层已尝试应用后因目标校验失败或其它错误抛出，主进程会用切换前保存的 `originalDisplayConfig` 尝试恢复，恢复失败才弹出系统级错误提示，避免“未建立 pending 状态但系统已变更”的安全缺口。

## 历史阻塞与当前状态

| 验证项 | 命令 | 当前状态 |
| --- | --- | --- |
| 原生模块 rebuild | `npm run rebuild --prefix src/modules/win32-displayconfig` | 已解除：SDK 安装后通过 |
| ASCII 路径原生模块 rebuild | 在 `C:\Users\11834\Desktop\code\resolution-build-ascii` 运行 `npm run rebuild --prefix src/modules/win32-displayconfig` | 已解除：SDK 安装后通过 |
| 原中文路径 Electron 打包 | `npm run electron-build` | 仍不稳定：中文路径下 `src/modules/node-ddcci` rebuild 触发 `node-gyp` / Python `gbk` 解码错误；设置 UTF-8 后仍因生成的 `binding.sln` 被 MSBuild 判定解析失败 |
| ASCII 路径 Electron 打包 | 在 `C:\Users\11834\Desktop\code\resolution-build-ascii` 运行 `npm run electron-build` | 已通过，生成 `dist\Twinkle Tray v1.17.2.exe` |
| 跳过 rebuild 打包 | `npx electron-builder --x64 --config.npmRebuild=false` | 历史尝试失败；当前未采用，最终产物来自完整 rebuild 打包 |

## `.exe` 产物

- 已生成可直接双击运行的 Windows `.exe` 安装包。
- 安装包路径：`C:\Users\11834\Desktop\code\resolution-build-ascii\dist\Twinkle Tray v1.17.2.exe`
- 安装包大小：`92223782` 字节。
- SHA256：`2F2C5E2D60A65B25F7CDC799BC8D676CB9B96D044BA35067E37BA50E3C9B2FF9`
- Unpacked 可执行文件路径：`C:\Users\11834\Desktop\code\resolution-build-ascii\dist\win-unpacked\Twinkle Tray.exe`
- 原中文工作区 `npm run electron-build` 仍不稳定；最终产物以 ASCII 路径构建结果为准。
- 当前安装包已禁用安装结束后自动运行；安装完成后应手动启动应用进行运行时验收。
- 已用修复后的安装包静默安装到 `C:\Users\11834\AppData\Local\Programs\twinkle-tray` 并完成启动验证。

## 待完成手工验收

- 真实显示器当前模式读取。
- 单显示器模式枚举、切换、确认、自动回滚。
- 面板关闭或失焦后自动回滚。
- 多显示器目标正确性。
- 收藏按显示器持久化，重启后仍可用。
- 设置总开关和筛选策略生效。
- 只显示收藏模式时，当前模式仍保留在列表中，避免无收藏时无法从面板添加收藏。
- 托盘右键菜单只展示收藏/常用模式。
- 快捷键切换收藏模式，不破坏现有亮度快捷键。
- 亮度、HDR SDR、DDC/CI 功能回归检查。
- `.exe` 文件存在性和可双击运行验证。
