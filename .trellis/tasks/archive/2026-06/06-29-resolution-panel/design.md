# 分辨率主面板接入设计

## 组件

在 `BrightnessPanel.jsx` 中新增分辨率行和模式下拉组件。组件应尽量局部化，避免把切换状态混入亮度滑块状态。

建议组件：

- `ResolutionControl`
- `ResolutionModeList`
- `ResolutionPendingChangeBar`

`ResolutionControl` 采用类似 Windows 11 快捷设置的分段展开形态：左侧区域显示当前分辨率/刷新率，右侧区域显示 chevron 小箭头。点击 chevron 展开模式列表；点击当前模式文本也可以展开同一列表，但不能绕过列表直接切换。

## IPC

通过 `panel-preload.js` 暴露最小 `window.resolution*` 函数，渲染层不直接操作 Electron IPC 细节。

## 布局

简单亮度布局中，分辨率行放在滑块下方；扩展功能布局中，作为一条 feature row 展示。确认条放在对应显示器区域下方或面板底部。
