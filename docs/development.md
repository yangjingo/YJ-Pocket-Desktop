# 开发与构建指南

[English](development.en.md) · 中文 · 返回[产品首页](../README.zh.md)

本文面向二次开发者。产品能力、未交付边界见 [中文 README](../README.zh.md) 和 [PRD](specs/PRD.md)；开发命令不代表安装包已在目标系统启动验收。

## 准备环境

安装 Node.js、npm，进入仓库后运行 `npm ci`。浏览、图片预览和受浏览器支持的音视频播放不要求外部服务；部分视频格式转换以及宣传片演示素材生成需要本机 `ffmpeg`。重新生成应用 PNG/ICO 还需要 Python 与 Pillow。

用户素材放在仓库外。当前机器默认使用同级的 `D:\YJ-Media`，目录可在设置中修改；不要把个人媒体、密钥或生成的索引提交进仓库。开发时可用 `YJ_MEDIA_ROOT` 指定隔离的测试库，`YJ_STATE_ROOT` 指定独立状态目录。

```powershell
npm ci
npm start
```

浏览器访问 `http://127.0.0.1:8765/`。`npm start` 先构建再启动本地服务；`npm run preview` 改用 8766 端口。服务只监听回环地址。首次运行如没有素材库，请先在设置中选择一个已存在的测试目录。

## 代码在哪里

| 目录 | 负责什么 |
| --- | --- |
| `app/` | HTML、CSS 和原创 SVG 静态资源 |
| `src/client/` | 桌面交互、3D 档案物件、语言词条 |
| `src/server/` | 本地 HTTP/API 与设置 |
| `src/voice/` | 录音识别与批处理 CLI |
| `src/shared/` | 不依赖具体运行端的工具 |
| `tests/` | 按 `src/` 功能镜像的测试 |
| `docs/media/promo/` | Remotion 宣传片工程、截图与配乐输入 |
| `dist/` | 本地构建输出；不入 Git，只保留最新包 |

`src/app.ts`、`src/server.ts`、`src/voice-transcribe.ts` 是薄构建入口；`src/electron-main.ts` 是桌面主进程入口。具体迁移和后续拆分计划见[源码布局](specs/source-layout.md)。应用与宣传片共享视觉语言，但宣传片不是应用运行时依赖。

## 修改后验证

```powershell
npm run lint
npm run check
npm test
npm run build
npm run build:voice
npm run promo:check
```

`npm test` 将测试编译到 `dist/tests/`，再运行 Node 测试；前端、服务端和 Electron 入口分别输出到 `dist/web/`、`dist/server.cjs`、`dist/electron-main.cjs`。当前测试覆盖设置、并发限制与 ASR 回退，不能代替完整 UI 或安装包验收。客户端改动还应在浏览器检查桌面、Finder、预览、语言及窄屏；打包后需在目标系统实际打开。不要把浏览器通过视为 EXE 通过。

## 构建与发布

```powershell
npm run icons
npm run dist:win
```

`npm run icons` 更新 `app/assets/media-archive/*.svg`；安装包图标以 `build/icon.svg` 为源，可运行 `python scripts/render-app-icon.py` 生成 PNG/ICO。Windows 便携包位于 `dist/packages/YJ-Pocket-Desktop-<version>-win-x64.exe`。`npm run dist:mac` 和 `npm run dist:linux` 必须分别在相应系统构建并实机验收，不能由 Windows 构建结果推断可用。发布前更新 `package.json` 与 `package-lock.json` 版本、[更新记录](../CHANGELOG.md)，按[发布流程](specs/release-process.md)审查隐私、许可证、包内资源和实际启动。`dist/` 不入 Git，公开发行包应单独上传到 Releases。

## 宣传片与录音工具

宣传片成片位于 `docs/media/`，可编辑工程位于 [`docs/media/promo/`](media/promo/README.md)：

```powershell
npm run promo:assets
npm run promo:check
npm run promo:studio
npm run promo:render:en
```

`promo:assets` 在 `dist/promo-demo-media/` 生成隔离演示库，并重建工程音频；重新拍摄界面的步骤见宣传片 README。录音批处理走 `node scripts/transcribe.mjs`，支持 `--root`、`--dry-run` 和 `--asr-only`。ASR 会调用外部服务，不要用真实录音做无意的测试；详情见[素材迁移规格](specs/media-library-migration.md)。
