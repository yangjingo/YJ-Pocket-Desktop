# 源码、测试与产物目录

状态：2026-09-30，第一阶段结构迁移已完成。本页只描述代码仓库；用户媒体仍独立存放在 `D:\YJ-Media`，不进入 `src/`、`tests/` 或 `dist/`。

```text
src/
  app.ts                    浏览器构建入口
  electron-main.ts          Electron 主进程入口
  server.ts                 本地服务构建入口
  voice-transcribe.ts       录音批处理构建入口
  client/
    desktop.ts              桌面 UI 与媒体交互
    archive/                3D 物件、场景、展台
    i18n/                   语言逻辑与词条
  server/
    http.ts                 本地 HTTP/API 服务
    settings.ts             设置读写与验证
  voice/
    asr.ts                  录音识别与缓存逻辑
    transcribe.ts           批处理 CLI
  shared/
    async-limit.ts          无浏览器/服务端依赖的并发工具
tests/
  server/settings.test.ts
  shared/async-limit.test.ts
  voice/asr.test.ts
docs/media/
  promo/                     宣传片工程源码、截图与音频输入
  yj-pocket-desktop-*.mp4     README 引用的成片
dist/                        当前构建产物与最新包（忽略，不进 Git）
```

`tests/` 按被测功能镜像 `src/`，以后新增客户端测试放在 `tests/client/`。源码目录不再混放 `*.test.ts`。根层四个入口保持轻薄，以维持现有 npm 命令、Electron 主模块和打包路径。`src/client/desktop.ts` 与 `src/server/http.ts` 仍是较大的控制器；本次只移动边界，不把 UI 状态机和 HTTP 路由一口气重写。后续按可验证的垂直功能逐步提取，例如客户端的 Finder/预览/播放器与服务端的媒体列表/缩略图/文件发送，并在对应 `tests/client/`、`tests/server/` 补测试。每次提取需保持现有 URL、设置格式与构建产物兼容。

## `dist/` 与 `docs/media/promo/` 的保留规则

- `dist/web/`、`dist/server.cjs`、`dist/electron-main.cjs`、`dist/voice-transcribe.cjs`、`dist/tests/` 可以由构建或测试重新生成。清理前先确认没有正在运行的本地服务或打包任务。
- `dist/packages/` 只保留当前 `1.2.3` Windows 便携包；先前版本 EXE、`archive/`、`win-unpacked/`、`builder-debug.yml`、`.icon-ico/` 等历史包和打包中间物按用户决定清理。新包仍需在允许的 Windows 设备启动验收。
- `dist/qa-*`、`promo-stills/`、`promo-capture-en/`、`promo-demo-media/` 是本地验收/拍摄输出；需要时通过应用测试或 `npm run promo:assets` 重新生成。它们不作为公开仓库资源。
- 旧的 `dist/legacy/`、`legacy-launcher/`、`private-reference/` 已按“只保留最新版本”决定清理。回收站中的文件可能暂时可恢复，但不属于当前源码或安装包；不要在文档中依赖这些路径。
- `docs/media/promo/` **不是**构建缓存：`*.tsx`、时间轴、生成/拍摄脚本、`README.md`、`public/screens/` 截图是重新渲染宣传片的输入，保留在源码仓库。`public/audio/*.wav` 可由脚本再生，已忽略；README 首页引用的成片同在 `docs/media/`。

清理策略是先生成清单和空间统计，按明确子目录处理；不对 `dist/` 或 `docs/media/promo/` 做整目录递归删除。测试命令、类型检查、lint、Web/服务端构建、录音 CLI 构建及宣传片类型检查均应在清理后重跑。
