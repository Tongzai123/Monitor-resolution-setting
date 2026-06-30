# 实施计划

## 修改清单

- [x] 修改 `src/electron.js` 默认设置：`language` 改为 `zh_Hans`，`checkForUpdates` 固定为 `false`。
- [x] 在 `src/electron.js` 中增加单一更新禁用常量，主进程更新检查、下载、安装和相关 IPC 都尊重该常量。
- [x] 调整 `processSettings()`，阻止旧设置或更新渠道变化重新触发上游检查。
- [x] 隐藏 `src/components/SettingsWindow.jsx` 中的更新侧边栏和更新页面。
- [x] 隐藏 `src/components/BrightnessPanel.jsx` 中的更新条和下载进度条。
- [x] 通过 `src/settings-preload.js` / `src/panel-preload.js` 暴露 `window.updatesDisabled`，更新 API 保持兼容但主进程无副作用。

## 验证

- [x] 运行 `npm run parcel-build`。
- [x] 搜索确认没有剩余 UI 入口会渲染普通用户更新页面。
- [x] 搜索确认 `checkForUpdates()` 不会访问 Twinkle Tray GitHub releases。

## 回滚点

如构建失败或 UI 受影响，优先回滚设置页/面板 UI 修改；主进程更新禁用逻辑保持为独立小改，便于定位问题。
