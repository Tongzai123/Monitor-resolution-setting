# 分辨率切换底层闭环设计

## 原生层

在 `src/modules/win32-displayconfig` 中增加模式枚举和应用函数。优先在现有 N-API 模块内实现，复用其已有 `QueryDisplayConfig`、`SetDisplayConfig`、设备名称转换和错误包装方式。

如果 `ChangeDisplaySettingsEx` 需要 `\\.\DISPLAYx` 设备名，而现有数据主要是 `devicePath`，则新增映射步骤：从活动 display config、display device 枚举和 monitor device path 建立关联。

首版原生 API 决策：

- 通过 `EnumDisplayDevices` 建立 `\\.\DISPLAYx`、显示设备 ID、monitor device path 和当前 `extractDisplayConfig()` 条目的映射。
- 通过 `EnumDisplaySettingsEx` 枚举目标 `\\.\DISPLAYx` 的可用 `DEVMODE`，保留宽、高、刷新率、色深、显示标志和原始设备名。
- 通过 `ChangeDisplaySettingsEx` 应用单显示器模式；应用前后都重新读取 `extractDisplayConfig()`，确认目标显示器当前模式确实变化。
- 不使用连接顺序作为持久身份；连接顺序只允许作为调试信息。
- 如果目标设备映射不唯一或应用后校验不到目标变化，返回错误并阻止切换，不尝试猜测目标屏幕。
- 如果实现期证明 `ChangeDisplaySettingsEx` 在当前工程中无法可靠应用单屏模式，则本任务只能交付当前模式读取和模式枚举，不开放切换 UI。

## 主进程层

新增 IPC：

- `resolution:list-modes`
- `resolution:apply-mode`
- `resolution:confirm-change`
- `resolution:revert-change`

主进程持有 `pendingResolutionChange`，用定时器驱动自动回滚，并向渲染层广播状态。

## 数据规范化

刷新率保留原始精度，展示时再格式化。去重时使用宽、高、刷新率精度、色深和扫描方式，不只用展示字符串。

## 错误处理

原生错误返回 Win32 code 和人类可读 message。主进程记录日志，UI 展示简短错误。

错误提示分级：

- 普通切换失败：面板错误条或系统通知。
- 自动回滚失败：系统级对话框，并保留日志中的 Win32 错误码。
