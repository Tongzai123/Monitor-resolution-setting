# 技术设计

## 边界

本任务只修改应用默认设置、主进程更新能力开关、preload 暴露面以及 React 设置/面板 UI。无需改动原生模块、安装器配置、分辨率功能或本地化文件内容。

## 数据流

### 语言默认值

`defaultSettings.language` 是新用户设置的来源。将默认值从 `system` 改为 `zh_Hans` 后，`getLocalization()` 会按现有逻辑读取 `src/localization/zh_Hans.json` 作为期望语言，并继续使用 `en.json` 作为兜底默认语言。

手动切换语言仍走现有流程：

`SettingsWindow.jsx` 语言选择器 -> `window.sendSettings({ language })` -> `electron.js processSettings()` -> `getLocalization()` -> `localization-updated`。

### 更新禁用

更新能力的权威边界放在主进程，避免仅隐藏 UI 后仍可由旧窗口或 preload 触发：

- 默认设置中 `checkForUpdates` 固定为 `false`。
- `processSettings()` 中收到 `checkForUpdates` 或 `branch` 时不再触发 `checkForUpdates()`。
- `checkForUpdates()` 直接返回，不访问 GitHub。
- `getLatestUpdate()` 和 `runUpdate()` 直接返回，不下载或运行上游安装包。
- 更新相关 IPC handler 保留但返回空状态，避免旧渲染进程调用时报错。

UI 层只负责隐藏入口：

- 设置侧边栏过滤 `updates`。
- 设置页不渲染 `updates` 页面。
- 托盘面板不渲染 `updateBar`。

## 兼容性

已有用户设置中可能存在 `checkForUpdates: true`、`branch` 或 `dismissedUpdate`。实现应让这些字段不再产生副作用，避免一次性迁移或删除用户设置带来额外风险。

保留语言选择器中的 `system` 选项，用户仍可主动恢复跟随系统语言。

## 取舍

选择功能级关闭而不是删除所有更新代码。这样改动范围较小，未来如果要接入自有更新源，可以在主进程边界处重新实现，而不会影响本次关闭目标。
