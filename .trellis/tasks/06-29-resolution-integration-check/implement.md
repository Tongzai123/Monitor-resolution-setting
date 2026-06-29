# 分辨率完整首版集成验收实施计划

1. 运行构建验证。
2. 启动应用做手工端到端验证。
3. 验证功能开关和回滚路径。
4. 检查设置文件不含异常数据。
5. 检查 git diff，确认没有无关改动。
6. 运行打包流程，生成可直接双击运行的 Windows `.exe` 产物。
7. 新增或更新 `verification.md`，记录手工验证结果、残余风险、后续建议和 `.exe` 输出路径。

## 验证

- `npm run parcel-build`
- `npm run electron-build`
- `npm run dev`
- 手工验收父任务所有验收标准。
- 检查 Electron Builder 输出目录中存在 `.exe`，并记录路径。
