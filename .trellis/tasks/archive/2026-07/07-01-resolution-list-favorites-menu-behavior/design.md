# 分辨率列表收藏菜单行为调整设计

## 架构边界

本任务只调整现有分辨率功能的展示筛选、目标模式选择、托盘菜单结构和收藏入口切换策略。

- 渲染层 `src/components/BrightnessPanel.jsx`：负责隐藏刷新率时的模式去重、列表展示、用户点击模式时传递明确意图。
- 主进程 `src/electron.js`：负责默认设置、右键菜单结构、收藏入口无回滚切换、应用模式的持久化策略。
- 设置页 `src/components/SettingsWindow.jsx`：保留现有开关，不需要结构性调整。
- 原生层 `src/modules/win32-displayconfig`：本任务不修改，继续复用现有 `getDisplayModes` / `setDisplayMode`。
- 便携版数据目录：在主进程启动早期设置 Electron `userData`，确保项目配置和 Electron 运行时数据使用同一便携目录。

## 模式展示与选择

### 隐藏刷新率列表去重

在 `BrightnessPanel.jsx` 中增加模式整理函数，输入为当前显示器完整模式列表和设置，输出为可展示模式列表。

建议分两层 helper：

- `getModeRefreshRate(mode)`：统一读取 `mode.refreshRate ?? mode.displayFrequency ?? 0`。
- `normalizeResolutionModesForDisplay(modes, settings)`：完成低刷新率过滤、只显示收藏过滤、隐藏刷新率时按 `width x height` 去重。

隐藏刷新率时，按 `width` 与 `height` 生成业务 key，例如 `${width}x${height}`。每组保留最高刷新率的模式作为代表项，这样用户点击该行时天然应用最高刷新率，不需要再用展示字符串二次查找。

排序与分组继续复用现有收藏/常用/全部模式逻辑；但这些分组应基于整理后的列表生成，避免相同分辨率进入多个可见重复项。

### 收藏状态

隐藏刷新率时，若同一分辨率下存在多个刷新率收藏，去重后的代表项可能不是某个已收藏的精确模式。为避免星标状态误导，建议：

- 去重代表项使用最高刷新率模式。
- 星标状态仍调用现有精确收藏匹配。
- 如果后续实现希望“任意刷新率收藏都让该分辨率显示为已收藏”，必须同时定义取消收藏行为；本任务不扩大到这种语义变化。

## 应用模式策略

### 带回滚入口

保留现有 `applyResolutionModeWithRollback(displayKey, mode)` 用于普通面板切换。它继续：

- 使用 `persistent: false` 临时应用。
- 建立 `pendingResolutionChange`。
- 由用户确认后持久化，或超时自动回滚。

### 无回滚收藏入口

新增主进程 helper，建议命名为 `applyResolutionModeDirect(displayKey, mode, options = {})` 或 `applyResolutionFavoriteMode(displayKey, favorite)`。

收藏入口直接应用应满足：

- 如果已有 `pendingResolutionChange`，先拒绝新切换，避免覆盖安全回滚点。
- 使用 `w32disp.setDisplayMode({ persistent: true })` 持久应用。
- 应用前仍通过 `findResolutionModeForFavorite` 从当前 Windows 枚举模式中找真实模式，不用收藏对象拼近似模式。
- 应用失败时沿用 `resolution:error` 广播，不弹系统级回滚对话框。
- 应用成功后调用 `refreshMonitors(true, true)` 更新面板和菜单状态。

右键菜单、快捷键、面板已收藏模式入口改用无回滚 helper。普通面板非收藏模式继续用带回滚 helper。

## 托盘右键菜单

将 `getResolutionTrayMenuItem()` 拆出小 helper，降低条件分支复杂度：

- `getResolutionMenuDisplays()`：返回当前可见、未隐藏、支持分辨率功能的显示器列表。
- `buildResolutionFavoriteSubmenu(displayKey, monitor)`：构建单台显示器的收藏菜单，保留无收藏兜底。

最终结构：

- `displays.length === 0`：返回隐藏菜单项。
- `displays.length === 1`：`分辨率 -> 收藏项 / 当前模式禁用项 / 更多分辨率...`
- `displays.length > 1`：`分辨率 -> 显示器名称 -> 收藏项 / 当前模式禁用项 / 更多分辨率...`

## 默认值兼容

只修改 `defaultSettings.resolutionShowRefreshRate` 为 `false`。现有设置读取流程应继续用保存设置覆盖默认值，因此已有用户选择不被覆盖。

实现阶段需要检查项目设置合并逻辑；如果发现旧设置缺失字段时会整体覆盖，应改成仅默认补齐缺失字段，而不是重写用户设置。

## 错误和安全边界

- 不改变自动回滚失败时系统级对话框逻辑。
- 直接收藏切换失败只做普通错误提示，不进入 pending。
- 已有 pending 变更时，收藏入口应提示“请先保留或还原当前分辨率更改”，不直接清除 pending。
- 多显示器仍使用当前 `resolutionDisplayKey -> win32DevicePath -> key` 降级策略，不新增不稳定绑定方式。

## 兼容性风险

- 隐藏刷新率后按最高刷新率去重，可能让用户无法从面板选择低刷新率；这是该设置语义的预期变化。用户需要低刷新率时应开启“显示刷新率”。
- 右键菜单扁平化只在单个可用显示器时生效；隐藏某台显示器后剩余一台可用显示器也会触发扁平化。
- 收藏入口无回滚提升效率，但降低误收藏后的安全保护；这与用户明确要求一致。
- 便携版数据目录从旧的 `resources/config` 调整到 exe 同级 `config`；旧便携版用户如果已有配置，需要手动把旧目录数据复制到新目录。
