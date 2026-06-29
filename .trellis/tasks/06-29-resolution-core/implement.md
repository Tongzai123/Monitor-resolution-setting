# 分辨率切换底层闭环实施计划

1. 阅读 `win32-displayconfig` C++ 和 JS 导出结构，确定扩展点。
2. 增加 `EnumDisplayDevices` 映射能力，明确 `devicePath` / `monitorDevicePath` 到 `\\.\DISPLAYx` 的关系。
3. 增加当前模式和 `EnumDisplaySettingsEx` 模式枚举 API。
4. 增加 `ChangeDisplaySettingsEx` 模式应用 API，先只支持单显示器模式切换。
5. 应用前后读取 `extractDisplayConfig()`，校验目标显示器确实变化，校验失败则返回错误。
6. 在 `Monitors.js` 合并当前分辨率、刷新率和稳定显示器 key 字段。
7. 在 `electron.js` 增加 IPC 和 `pendingResolutionChange` 状态机。
8. 增加调试路径验证：列出模式、应用模式、确认、自动回滚。
9. 运行构建和手工验证。

## 验证

- `npm run parcel-build`
- `npm run dev`
- 手工切换一个非当前模式并等待自动回滚。
- 多显示器环境下验证不会对错误显示器应用模式；无法可靠验证时必须记录残余风险。
