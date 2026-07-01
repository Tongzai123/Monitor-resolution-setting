# 分辨率列表收藏菜单行为调整实施计划

## 实施顺序

1. 读取项目规范
   - 使用 `trellis-before-dev` 加载前端相关规范。
   - 重点关注 Electron IPC、React 状态、构建验证要求。

2. 调整默认设置
   - 在 `src/electron.js` 将 `defaultSettings.resolutionShowRefreshRate` 改为 `false`。
   - 检查设置合并逻辑，确认已有用户保存值不会被覆盖。

3. 调整面板模式整理
   - 在 `src/components/BrightnessPanel.jsx` 增加刷新率读取、模式业务 key、隐藏刷新率去重 helper。
   - 将 `ResolutionModeList` 的过滤、去重、分组统一通过 helper 处理。
   - 隐藏刷新率时，每个分辨率保留最高刷新率代表项。
   - 保持开启刷新率时现有精确模式列表行为。

4. 增加收藏直接应用入口
   - 在 `src/electron.js` 增加无回滚的直接应用 helper。
   - 右键菜单收藏点击改用直接应用 helper。
   - 快捷键 resolution action 改用直接应用 helper。
   - 确保已有 pending 变更时拒绝直接应用并广播可本地化错误。

5. 调整右键菜单结构
   - 重构 `getResolutionTrayMenuItem()` 的显示器列表构建。
   - 单显示器时返回直接收藏菜单。
   - 多显示器时保留当前按显示器名称分层。
   - 保留无收藏兜底项和“更多分辨率...”入口。

6. 根据用户答复决定面板收藏项行为
   - 面板点击已收藏模式时，调用无回滚直接应用路径。
   - 面板点击非收藏模式时，继续调用带确认/回滚路径。

7. 验证
   - `node --check src/electron.js`
   - `node --check src/panel-preload.js`
   - 使用项目现有 Babel/构建链验证 `BrightnessPanel.jsx`。
   - `npm run parcel-build`
   - 如涉及运行体验，启动 `npm run dev` 做手工验证。

## 重点检查点

- 关闭“显示刷新率”后，不同刷新率不会再显示为重复分辨率。
- 关闭“显示刷新率”后，代表模式确实是最高刷新率。
- 右键菜单单屏和多屏结构都符合预期。
- 收藏入口无回滚不会影响普通非收藏切换的 pending/回滚流程。
- 旧字符串收藏和新对象收藏仍能匹配。
- `resolutionShowAllModes` 开启时，隐藏刷新率仍不制造重复可见分辨率。

## 风险文件

- `src/electron.js`：主进程设置、快捷键、托盘菜单、分辨率回滚状态集中在同一文件，改动需保持范围小。
- `src/components/BrightnessPanel.jsx`：列表过滤、收藏状态、点击应用都在组件内，需避免 React key 冲突和状态不同步。
- `src/localization/en.json`、`src/localization/zh_Hans.json`：仅在新增用户可见错误文案时修改。

## 回滚点

- 如果直接应用收藏模式导致目标验证不足，先保留右键菜单结构与列表去重，收藏入口回退到带回滚流程，并在 PRD 中重新确认安全策略。
- 如果隐藏刷新率下去重与收藏星标语义冲突明显，先以“最高刷新率代表项是否精确收藏”为准，不扩大收藏数据模型。

## 当前状态

当前任务已进入 `in_progress`。实现完成后按验证清单执行质量检查，再进入收尾。
