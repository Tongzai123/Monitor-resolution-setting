# 打包报错原因与解决方案记录

## 背景

本项目原始工作目录为：

```text
C:\Users\11834\Desktop\code\分辨率修改
```

本次目标是完成分辨率功能开发后，生成一个用户可直接双击运行的 Windows `.exe` 安装包。

过程中遇到两类问题：

1. 原中文路径下原生模块 rebuild / Electron Builder 打包不稳定。
2. 安装包安装完成后，点击桌面图标启动出现 Electron 主进程 JavaScript 报错。

## 问题一：中文路径导致原生打包不稳定

### 现象

在原目录 `C:\Users\11834\Desktop\code\分辨率修改` 下执行 Electron 打包时，原生模块 rebuild 过程中出现 `node-gyp` / MSBuild 相关异常。

典型表现包括：

- Python / `node-gyp` 在处理输出时出现编码问题。
- 设置 UTF-8 后，仍可能因为中文路径生成的 `binding.sln` 被 MSBuild 判定解析失败。
- 原生模块如 `src/modules/node-ddcci`、`src/modules/win32-displayconfig` 等参与 Electron Builder rebuild 时不稳定。

### 原因

该问题不是业务代码问题，而是 Windows 原生构建链路对非 ASCII 路径兼容性不稳定。

涉及的链路包括：

- `node-gyp`
- Python
- MSBuild
- Windows SDK
- Electron Builder 的 native dependency rebuild

这些工具链在含中文字符的项目路径下可能出现编码或工程文件解析问题。

### 解决方案

创建 ASCII 路径构建副本：

```text
C:\Users\11834\Desktop\code\resolution-build-ascii
```

该目录只作为打包工作区使用，真实源码仍以原目录为准。

打包流程改为：

```powershell
cd C:\Users\11834\Desktop\code\resolution-build-ascii
npm run parcel-build
npm run electron-build
```

最终安装包输出：

```text
C:\Users\11834\Desktop\code\resolution-build-ascii\dist\Twinkle Tray v1.17.2.exe
```

## 问题二：安装后启动报 JavaScript Error

### 现象

安装完成后，点击桌面图标或启动安装目录 exe，出现 Electron 错误弹窗：

```text
A JavaScript error occurred in the main process
Cannot find module '...\node_modules\@paymoapp\active-window\dist\index.js'
Please verify that the package.json has a valid "main" entry
```

注意：该报错中的 `valid "main" entry` 容易被误判为项目根目录 `package.json.main` 错误。实际本次缺失的是依赖包自己的入口文件。

### 真实原因

依赖 `@paymoapp/active-window` 的 `package.json` 中声明：

```json
{
  "main": "./dist/index.js"
}
```

但它原来的构建脚本是：

```json
{
  "build": "npm run build:gyp"
}
```

这只会执行原生模块编译，生成 `.node` 文件，不会生成 `dist/index.js`。

因此出现了这种不完整状态：

- 原生文件存在：`build\Release\PaymoActiveWindow.node`
- JavaScript 入口缺失：`dist\index.js`

Electron 启动主进程时执行：

```js
const ActiveWindow = require('@paymoapp/active-window').default
```

Node 会读取 `@paymoapp/active-window/package.json.main`，尝试加载 `./dist/index.js`，但安装后的应用中没有该文件，于是主进程启动失败。

### 修复方案

修改 `src/modules/node-active-window/package.json`，确保构建时同时生成 JS 入口和原生模块：

```json
{
  "scripts": {
    "postinstall": "npm run build",
    "build": "npm run build:ts && npm run build:gyp",
    "build:ts": "tsc --project tsconfig.build.json",
    "build:gyp": "node-gyp rebuild"
  }
}
```

同时修改 `src/modules/node-active-window/tsconfig.json`，移除过窄的 `typeRoots` 限制，使 TypeScript 能正常找到项目已有的 Node 类型定义。

修复后验证：

```powershell
npm run build:ts --prefix src/modules/node-active-window
```

结果：通过，并生成：

```text
src\modules\node-active-window\dist\index.js
src\modules\node-active-window\dist\types.js
```

## 安装包验证方法

不要只验证 `dist\win-unpacked`，必须验证安装后的真实运行结果。

建议完整检查流程：

```powershell
cd C:\Users\11834\Desktop\code\resolution-build-ascii
npm run parcel-build
npm run electron-build
```

静默安装：

```powershell
Start-Process -FilePath "C:\Users\11834\Desktop\code\resolution-build-ascii\dist\Twinkle Tray v1.17.2.exe" -ArgumentList "/S" -Wait
```

检查安装目录关键文件：

```powershell
Test-Path "C:\Users\11834\AppData\Local\Programs\twinkle-tray\resources\app.asar.unpacked\node_modules\@paymoapp\active-window\dist\index.js"
Test-Path "C:\Users\11834\AppData\Local\Programs\twinkle-tray\resources\app.asar.unpacked\node_modules\@paymoapp\active-window\build\Release\PaymoActiveWindow.node"
```

两个结果都必须为：

```text
True
True
```

然后启动安装后的 exe：

```powershell
Start-Process "C:\Users\11834\AppData\Local\Programs\twinkle-tray\Twinkle Tray.exe"
```

正确结果：

- 不再出现 `A JavaScript error occurred in the main process`。
- 可正常看到 Twinkle Tray 首次启动引导窗口或托盘程序正常运行。

## 最终产物信息

当前已验证通过的安装包：

```text
C:\Users\11834\Desktop\code\resolution-build-ascii\dist\Twinkle Tray v1.17.2.exe
```

大小：

```text
92223782 字节
```

SHA256：

```text
2F2C5E2D60A65B25F7CDC799BC8D676CB9B96D044BA35067E37BA50E3C9B2FF9
```

## 后续防止复发的规则

1. 本项目涉及 Electron native dependency 时，不能只看 `.node` 是否生成。
2. 如果依赖包的 `package.json.main` 指向 `dist/*.js`，必须确认 `dist/*.js` 已生成并被打进安装后的应用目录。
3. Electron Builder 成功不等于安装包可运行，必须安装后启动真实安装目录 exe。
4. 原中文路径下原生 rebuild 不稳定时，继续使用 ASCII 构建副本打包。
5. 每次输出最终 `.exe` 时，记录路径、大小、SHA256、安装结果和启动结果。

