# 分辨率显示与切换完整首版设计

## 架构边界

该功能分为四层：

- 原生能力层：扩展 `src/modules/win32-displayconfig`，提供显示模式枚举、当前模式读取、模式应用能力。
- 主进程协调层：在 `src/electron.js` 中维护 IPC、设置、菜单、快捷键、切换确认和回滚状态。
- 显示器数据层：在 `src/Monitors.js` 合并当前分辨率、刷新率、设备路径、Win32 配置 ID 等字段。
- 渲染层：在 `BrightnessPanel.jsx` 和 `SettingsWindow.jsx` 中显示当前模式、下拉模式列表、确认条、设置和收藏管理。

## 数据流

1. `Monitors.js` 调用 `win32-displayconfig.extractDisplayConfig()` 获取活动显示器配置。
2. 显示器对象保留稳定字段：`devicePath`、`sourceConfigId`、`targetConfigId`、`outputTechnology`、`sourceMode`、`targetVideoSignalInfo`。
3. 主进程通过新 IPC 接收模式列表请求，调用原生枚举函数返回规范化模式列表。
4. 渲染层发起切换请求，主进程记录原始模式和原始配置，再调用原生应用函数。
5. 主进程创建 `pendingResolutionChange`，向面板广播确认倒计时状态。
6. 用户确认则清除 pending 状态；用户还原或倒计时结束则调用原生还原能力。

## 原生接口草案

优先扩展现有 `win32-displayconfig` 模块，而不是新增割裂模块。

```js
getDisplayModes({ deviceNameOrPath })
getCurrentDisplayMode({ deviceNameOrPath })
setDisplayMode({ deviceNameOrPath, mode })
```

首版优先方案：

- 模式枚举使用 Win32 `EnumDisplaySettingsEx`，返回 Windows 对指定显示设备报告的可用 `DEVMODE` 列表。
- 模式应用使用 Win32 `ChangeDisplaySettingsEx`，只对单台目标显示器应用目标模式，不管理显示器排列、主屏、复制或扩展模式。
- `QueryDisplayConfig` / `extractDisplayConfig` 继续作为活动显示器、当前配置、设备路径和回滚所需原始配置的来源。
- 如果实现期发现 `ChangeDisplaySettingsEx` 不能可靠命中特定目标显示器，底层任务必须先降级为“显示当前模式和枚举模式”，暂停切换入口，不允许上线可能切错屏的切换能力。

模式对象至少包含：

```js
{
  width,
  height,
  refreshRate,
  refreshRateNumerator,
  refreshRateDenominator,
  bitsPerPel,
  displayFrequency,
  displayFlags,
  rawDeviceName,
  isCurrent,
  isRecommended
}
```

## 设置数据

新增设置建议：

```json
{
  "resolutionControlsEnabled": true,
  "resolutionShowRefreshRate": true,
  "resolutionHideLowRefreshRates": true,
  "resolutionShowOnlyFavorites": false,
  "resolutionShowAllModes": false,
  "resolutionRevertTimeoutSeconds": 15,
  "resolutionFavorites": {
    "display-key": [
      { "width": 3840, "height": 2160, "refreshRate": 60 },
      { "width": 2560, "height": 1440, "refreshRate": 144 }
    ]
  },
  "resolutionPresets": []
}
```

`display-key` 不能只用 `DISPLAY1` 或连接顺序，应优先使用稳定设备路径/EDID 派生 ID，并保留降级匹配策略。

显示器 key 匹配优先级：

1. `win32-displayconfig` 的 `devicePath` / `monitorDevicePath`。
2. 现有 monitor 的硬件 ID 与序列号组合，例如 `hwid[1]` 加 `serial`。
3. 现有 `monitor.key` 或当前会话 ID 作为临时降级，只用于显示，不用于删除或覆盖已保存收藏。

收藏匹配失败时，不自动删除收藏；当前设备不可用时隐藏或标记不可用，等同一显示器重新出现后再恢复匹配。

## 回滚状态

回滚必须由主进程维护：

```js
{
  id,
  displayKey,
  originalMode,
  targetMode,
  originalDisplayConfig,
  expiresAt,
  timeout
}
```

渲染层只显示状态并发送 `confirm` / `revert` 请求。面板关闭、失焦或隐藏不应停止倒计时。

## UI 原则

- 分辨率入口附着在现有显示器卡片，不做独立大面板。
- 当前分辨率行默认紧凑显示，采用类似 Windows 11 快捷设置的分段展开组件：左侧显示当前 `width x height · Hz`，右侧使用 chevron 小箭头表达可展开。
- 点击右侧 chevron 展开模式列表；为提升易用性，点击当前模式文本区域也可以打开同一列表，但不能直接切换。
- 模式列表按收藏、当前模式、常见模式、全部模式分组。
- 刷新率必须和分辨率同一行展示。
- 确认条不能遮挡亮度滑块。
- 右键菜单只放收藏/常用模式和“更多分辨率...”入口。

## 兼容性

- 虚拟显示器和远程桌面环境中允许显示当前模式，但切换能力可禁用或降级。
- 切换前后必须校验目标显示器当前模式变化，避免对错屏应用。
- 模式显示可四舍五入刷新率，应用必须保留原始精度。

## 错误提示

- 普通切换失败只在托盘面板或通知中提示。
- 自动回滚失败属于高风险异常，允许主进程弹出系统级对话框，提示用户使用 Windows 显示设置手动恢复。

## 打包产物

最终集成验收阶段使用现有 Electron Builder 流程产出 Windows `.exe`。优先运行 `npm run electron-build`；如果需要确保前端资源已构建，则先运行 `npm run parcel-build`。验收记录必须写明实际产物路径，例如 `dist/*.exe` 或 Electron Builder 输出目录中的具体文件。
