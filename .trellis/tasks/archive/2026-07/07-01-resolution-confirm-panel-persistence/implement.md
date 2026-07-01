# 分辨率确认期间保持面板显示实施计划

## 实施步骤

1. 读取前端规范和相关源码，确认窗口隐藏路径、分辨率待确认状态和面板显示流程。
2. 在 `src/electron.js` 增加分辨率确认保护态判断函数。
3. 在外部点击隐藏面板逻辑中接入保护态，待确认期间跳过 `panelBlur` 和 `showPanel(false)`。
4. 在 `startResolutionPendingChange()` 中确保面板可见并置顶，复用现有 `showPanel(true, panelSize.height)` 或等价已有流程。
5. 在待确认状态清除后恢复普通逻辑，不主动改变分辨率确认结果。
6. 在 `blur-panel` IPC 路径中接入保护态，待确认期间拦截 `Escape` 等主动隐藏行为。
7. 在窗口 `blur`、覆盖层隐藏和 `panel-hidden` 回调路径补充同一保护态，避免隐藏动画或失焦事件绕过确认锁。
8. 在 `panel-preload.js` 拦截确认期间的本地隐藏 UI 动作，避免 renderer 先把内容收起。
9. 运行可用验证。

## 验证命令

- `npm run parcel-build`
- `node --check src/electron.js`
- `node --check src/panel-preload.js`

## 验证结果

- `node --check src/electron.js`：通过。
- `node --check src/panel-preload.js`：通过。
- `npm run parcel-build`：通过。构建输出包含 `baseline-browser-mapping` 和 `Browserslist` 数据过期提示，未影响构建成功。
- 真实分辨率切换手工验证：未执行。该验证会改变当前显示器模式，需要用户在本机现场确认后操作。

## 手工验证

- 切换分辨率后确认条出现。
- 倒计时期间点击桌面或其他窗口，面板不消失。
- 倒计时期间按 `Escape`，面板不消失。
- 点击“保留更改”后，再点击外部，面板正常隐藏。
- 点击“还原”后，再点击外部，面板正常隐藏。
- 等待倒计时自动还原后，再点击外部，面板正常隐藏。
- 没有待确认状态时，亮度面板外部点击隐藏行为不变。

## 风险文件

- `src/electron.js`：主进程窗口状态、托盘面板显示隐藏、分辨率待确认和回滚状态。
- `src/panel-preload.js`：面板隐藏事件接收路径和主动隐藏动作。
- `src/components/BrightnessPanel.jsx`：确认条展示和按钮事件，原则上本任务不改。
