# 分辨率列表收藏菜单行为调整

## 目标

修正分辨率功能在隐藏刷新率、单显示器右键菜单、收藏模式切换时的体验不一致问题，让托盘面板和右键菜单更符合用户的实际操作路径。

用户价值：

- 关闭“显示刷新率”后，面板分辨率列表只显示唯一分辨率，不再出现多个相同 `3840x2160` 项。
- 用户隐藏刷新率后选择某个分辨率时，应用该分辨率下可用的最高刷新率，避免误切到低刷新率。
- 单显示器场景下，右键托盘菜单的“分辨率”直接展开收藏分辨率，减少一级无意义的显示器名称菜单。
- 已收藏分辨率被视为用户确认过的安全模式，从收藏入口切换时不再弹出确认/回滚条。

## 已确认事实

- `src/electron.js:489` 的默认设置当前为 `resolutionShowRefreshRate: true`，与本任务要求的默认关闭不一致。
- `src/components/SettingsWindow.jsx:1382` 已有“显示刷新率”设置项，使用 `resolutionShowRefreshRate` 作为开关。
- `src/components/BrightnessPanel.jsx:55` 起的 `ResolutionModeList` 会根据低刷新率、只显示收藏等设置过滤模式，但在 `resolutionShowRefreshRate=false` 时没有按分辨率去重。
- `src/components/BrightnessPanel.jsx:91` 使用 `formatResolutionMode(mode, window.settings?.resolutionShowRefreshRate)` 生成列表标签；隐藏刷新率时，不同刷新率会显示成相同文本。
- `src/components/BrightnessPanel.jsx:406` 起的面板切换会把用户点击的完整 `mode` 直接发送给 `window.resolution.applyMode`，当前没有“隐藏刷新率时按同分辨率最高刷新率重选目标模式”的逻辑。
- `src/electron.js:1786` 的 `applyResolutionModeWithRollback(displayKey, mode)` 是当前统一带确认/回滚的分辨率切换入口。
- `src/electron.js:2622` 的 `resolution:apply-mode` IPC 当前总是调用 `applyResolutionModeWithRollback`。
- `src/electron.js:1179` 起的快捷键收藏切换和 `src/electron.js:3775` 起的托盘右键收藏切换当前也调用 `applyResolutionModeWithRollback`，因此会触发确认/回滚。
- `src/electron.js:3760` 起的 `getResolutionTrayMenuItem()` 当前总是先按显示器构建一级子菜单；即使只有一个可显示显示器，也会展示显示器名称。
- 历史任务 `.trellis/tasks/archive/2026-06/06-29-resolution-integration-check/verification.md` 记录：默认不显示全部模式时，底层模式列表已按“分辨率+刷新率”整理；本任务要处理的是隐藏刷新率后的“显示维度去重”和“目标模式选择”。

## 需求

### R1 隐藏刷新率时列表按分辨率去重

当 `resolutionShowRefreshRate=false` 时，托盘面板的分辨率列表必须按 `width x height` 去重，同一个分辨率只出现一次。

- 去重必须发生在低刷新率过滤、只显示收藏过滤、收藏分组/常用分组之前或以等效方式确保各分组内不重复。
- 展示仍使用现有本地化和样式，不新增解释性文案。
- 开启“显示所有 Windows 模式”时，如果 `resolutionShowRefreshRate=false`，仍应优先保证用户看不到重复的同分辨率普通项；底层 RAW 参数差异不应在隐藏刷新率模式下制造多个相同用户可见项。

### R2 隐藏刷新率时选择最高刷新率

当 `resolutionShowRefreshRate=false` 时，用户在托盘面板选择某个分辨率，实际应用目标必须是该分辨率下当前可用的最高刷新率模式。

- “最高刷新率”以 Windows 枚举模式中的 `refreshRate` 或 `displayFrequency` 数值比较。
- 若最高刷新率存在多个底层模式参数差异，应优先选择当前去重代表项中保留的安全模式；实现需保持可解释、可复用，不能只依赖展示字符串。
- 当 `resolutionShowRefreshRate=true` 时，用户选择哪个分辨率/刷新率组合，就应用哪个完整模式，保持现有精确选择语义。

### R3 “显示刷新率”默认关闭

新安装或无旧设置的用户，`resolutionShowRefreshRate` 默认值必须为 `false`。

- 已有用户如果设置文件中明确保存了 `resolutionShowRefreshRate`，不得强行覆盖用户选择。
- 设置页现有开关继续保留，用户可以手动开启刷新率显示。

### R4 单显示器右键菜单扁平化

当当前可见且支持分辨率功能的显示器只有一个时，托盘右键菜单中的“分辨率”项必须直接展示该显示器的收藏分辨率菜单，不再先显示显示器名称。

- 单显示器无收藏时，保持现有兜底项：显示当前模式禁用项和“更多分辨率...”入口，但这些项应直接位于“分辨率”子菜单内。
- 多显示器时保留现状：先展示显示器名称，再展示该显示器的收藏分辨率。
- 隐藏显示器、无分辨率数据、功能关闭的显示器不计入“当前可见且支持分辨率功能的显示器”。

### R5 收藏入口切换不弹确认/回滚

用户从已收藏分辨率入口切换时，不需要显示确认/回滚条。

- 托盘右键菜单只展示已收藏分辨率，因此从右键菜单切换必须直接持久应用目标模式，不进入 `pendingResolutionChange`。
- 快捷键“切换分辨率”也基于收藏模式，按同一规则直接持久应用目标模式，不进入 `pendingResolutionChange`。
- 托盘面板中点击已收藏模式时，也按同一规则直接持久应用目标模式，不进入 `pendingResolutionChange`。
- 托盘面板普通模式列表中的非收藏项继续使用现有确认/回滚流程。

## 非目标

- 不改变底层 Win32 模式枚举和应用能力。
- 不新增 DPI、HDR、色深、颜色格式、显示器排列等功能。
- 不改变收藏数据结构，除非实现过程中发现必须兼容旧数据或修复精确匹配。
- 不删除已有本地化键；如需新增错误文案，必须同时更新中英文资源。

## 验收标准

- [ ] 默认设置中 `resolutionShowRefreshRate` 为 `false`；已有用户保存值不被覆盖。
- [ ] 关闭“显示刷新率”后，托盘面板展开分辨率列表，同一 `width x height` 只出现一次。
- [ ] 关闭“显示刷新率”后，从面板选择某个分辨率，实际应用该分辨率下可用的最高刷新率。
- [ ] 开启“显示刷新率”后，面板列表恢复按分辨率/刷新率组合展示，并可精确选择具体刷新率。
- [ ] 单显示器时，右键托盘菜单“分辨率”直接显示收藏分辨率，不再出现显示器名称中间层。
- [ ] 多显示器时，右键托盘菜单仍先显示显示器名称，再显示各自收藏分辨率。
- [ ] 从右键托盘菜单切换收藏分辨率时，不出现确认/回滚条，并持久应用目标模式。
- [ ] 从快捷键切换收藏分辨率时，不出现确认/回滚条，并持久应用目标模式。
- [ ] 从托盘面板点击已收藏分辨率时，不出现确认/回滚条，并持久应用目标模式。
- [ ] 托盘面板普通非收藏模式切换仍出现确认/回滚条，面板关闭后自动回滚能力不被破坏。
- [ ] 收藏不可用、目标模式应用失败、已有 pending 变更等错误路径仍能通过现有错误通知或面板错误提示反馈。
- [ ] `npm run parcel-build` 通过；至少对 `src/electron.js`、`src/components/BrightnessPanel.jsx` 做语法/转译检查。
