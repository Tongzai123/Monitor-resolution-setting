# 分辨率确认期间保持面板显示设计

## 目标

在分辨率待确认期间，为托盘悬浮面板增加临时保护态，使外部点击和失焦不会隐藏面板；待确认状态结束后恢复原有隐藏逻辑。

## 边界

- 主进程负责待确认状态、自动回滚、窗口显示隐藏和置顶控制。
- 渲染进程继续展示 `resolution:pending-change` 状态和按钮；`panel-preload.js` 只拦截本地隐藏 UI 的动作，不承担窗口置顶、倒计时或回滚安全职责。
- 不新增 IPC 契约，优先复用现有 `pendingResolutionChange` 作为保护态来源。

## 数据流

1. 用户选择分辨率模式。
2. `resolution:apply-mode` 调用带回滚的分辨率应用流程。
3. `startResolutionPendingChange()` 设置 `pendingResolutionChange`，启动广播和超时回滚。
4. 主进程确保面板可见并置顶。
5. 用户点击外部区域时，全局鼠标事件检查到存在 `pendingResolutionChange`，跳过隐藏面板。
6. `panel-preload.js` 收到 `panelBlur` 或用户触发设置/关闭显示器等本地隐藏动作时，如果 `window.pendingResolutionChange` 存在，则跳过隐藏 UI。
7. 用户保留、手动还原或超时还原后，`clearResolutionPendingChange()` 清理状态并广播 `null`。
8. 后续外部点击按原逻辑隐藏面板。

## 关键设计

- 保护态判断应集中为一个小函数，例如 `shouldKeepPanelVisibleForResolutionConfirmation()`，避免多处直接读取 `pendingResolutionChange` 后语义发散。
- 外部点击隐藏路径应在发送 `panelBlur` 和调用 `showPanel(false)` 前检查保护态。
- `blur-panel` IPC 主要由 `Escape`、打开设置、关闭显示器等主动操作触发。分辨率确认期间必须拦截隐藏行为，避免误触导致面板消失。
- renderer 已经先行隐藏 UI 的路径需要在 `panel-preload.js` 同步拦截，避免主进程窗口仍显示但面板内容已经收起。
- 待确认开始时，如果面板未显示，应调用现有面板显示流程，而不是新增独立窗口或新的确认弹窗。

## 兼容性

- 自动回滚不依赖面板可见性，保持现有主进程超时逻辑。
- 直接应用收藏分辨率的流程如果不创建 `pendingResolutionChange`，不进入保护态。
- 开发者工具打开时的现有保护逻辑保持不变。

## 风险

- 如果保护态只阻止全局鼠标事件，`Escape` 或其他 IPC 主动隐藏路径仍会导致面板消失，因此 `blur-panel` 路径也必须检查保护态。
- 如果待确认开始时直接调用 `showPanel(true)`，需要避免破坏面板高度和定位。
- 如果恢复普通逻辑时立即 `setAlwaysOnTop(false)`，可能会和仍可见面板的现有体验不同；更稳妥的方式是让后续普通隐藏流程自然关闭置顶。
