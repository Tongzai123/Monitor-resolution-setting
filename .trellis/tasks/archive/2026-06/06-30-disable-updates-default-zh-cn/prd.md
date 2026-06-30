# 关闭更新并默认简体中文

## 目标

本项目是基于 Twinkle Tray 的二次开发版本，不再面向上游 Twinkle Tray 更新渠道。新安装后的应用应默认显示简体中文，并且不再展示或触发上游更新检查、下载、安装相关能力。

## 已确认事实

- 当前默认设置在 `src/electron.js` 中定义：`checkForUpdates: !isDev` 会让正式版默认启用更新检查，`language: "system"` 会让新用户跟随系统语言。
- 更新检查、下载和安装逻辑集中在 `src/electron.js` 的 App Updates 区域，并通过 `check-for-updates`、`get-update`、`ignore-update`、`clear-update` 等 IPC 与 preload/UI 通信。
- 设置页侧边栏包含 `updates` 页面，设置页中也展示更新版本、自动更新开关和更新渠道选择。
- 托盘面板会根据 `latest-version` 事件展示更新可用条和下载进度条。
- 简体中文本地化文件已存在于 `src/localization/zh_Hans.json`，现有语言选择器已支持手动选择 `zh_Hans`。

## 需求

- R1：新安装或没有历史设置的用户，默认语言必须是简体中文，即 `zh_Hans`。
- R2：保留用户手动切换语言的能力；用户仍可在设置页改为系统语言、英文或其它已有语言。
- R3：正式版和开发版都不得默认检查 Twinkle Tray 上游更新。
- R4：隐藏面向普通用户的更新设置 UI，包括设置页侧边栏入口、更新页面、自动更新开关和更新渠道选择。
- R5：阻断手动或旧窗口残留触发的更新检查、下载和安装链路，避免访问 `https://api.github.com/repos/xanderfrangos/twinkle-tray/releases` 或下载上游安装包。
- R6：已有旧设置中的 `checkForUpdates: true` 不应重新启用更新能力；本需求要求功能级关闭，而不只是改默认值。
- R7：不删除本地化文件、不破坏现有亮度、分辨率、快捷键、托盘菜单和设置保存机制。

## 非目标

- 不实现新的自有更新服务器或二次开发版本更新渠道。
- 不删除全部更新相关源码文件；允许保留死代码或兼容 IPC，但运行时必须禁用。
- 不重命名应用、修改安装包发布配置或调整 CI/CD。

## 验收标准

- [ ] 首次启动默认设置中 `language` 为 `zh_Hans`，界面显示简体中文。
- [ ] 设置页仍能手动切换语言，并且切换后会按现有流程保存和刷新本地化。
- [ ] 默认设置和运行时设置中 `checkForUpdates` 不会启用上游更新能力。
- [ ] 设置页侧边栏不显示“Updates/更新”入口，普通设置页不展示更新检查、下载、自动更新或渠道选择 UI。
- [ ] 托盘面板不展示更新可用条或更新下载进度条。
- [ ] 即使 preload 或旧窗口发送 `check-for-updates` / `get-update` / `clear-update` / `ignore-update`，主进程也不会检查、下载或安装上游更新。
- [ ] `npm run parcel-build` 成功。

## 开放问题

无阻塞开放问题。当前按“完全关闭上游更新能力，同时保留语言选择器”实施。
