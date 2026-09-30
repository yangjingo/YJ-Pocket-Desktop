# Electron 跨平台桌面包

状态：2026-09-30，Windows x64 `1.2.3` 便携 EXE 已从当前源码构建：`dist/packages/YJ-Pocket-Desktop-1.2.3-win-x64.exe`，101,029,688 字节（约 96.3 MiB），SHA-256 `65E23F8519DB997624C653BDDC3266AF342DB09F85F31FC45DC09763E7FBED85`。已核对包内版本、HTML、CSS、图标、前端两块代码、本地服务与 Electron 主进程；EXE 的 Authenticode 状态为 `NotSigned`。当前设备的企业 Code Integrity 策略阻止不受信任的 EXE 启动，因此 GitHub `v1.2.3` 标为预发布版，仍须在允许的 Windows 设备实机验收。macOS/Linux 仅配置构建脚本，尚未在对应系统验收。产品界面与媒体行为见[交互规格](interaction-spec.md)。

## 交付物

| 系统 | 文件 | 构建环境 |
| --- | --- | --- |
| Windows | 单文件便携版 `YJ-Pocket-Desktop-<version>-win-x64.exe` | Windows x64 |
| macOS | `YJ-Pocket-Desktop-<version>-mac-<arch>.dmg` / `.app` | macOS；正式分发需签名与公证 |
| Linux | `YJ-Pocket-Desktop-<version>-linux-<arch>.AppImage` | Linux x64 |

`.exe` 是 Windows 格式；跨平台指同一套 TypeScript/Electron 源码生成各平台原生包。当前机器已完成 Windows 构建和包内资源核对；新包尚未运行，旧包曾受企业策略阻断。macOS/Linux 需要对应系统上的构建与打开验证。

当前应用图标源文件为中性银灰的 `build/icon.svg`；`scripts/render-app-icon.py` 将其生成多尺寸 `build/icon.ico` 和 `build/icon.png`，供 Windows 与其他平台打包使用。先前探索资产已随旧版 `dist/` 清理，不是当前包的图标源。

## 运行结构

```text
Electron 主进程（单实例）
  ├─ 启动内置 Node HTTP 服务，在 127.0.0.1 的安全高端口范围选取空闲端口
  ├─ BrowserWindow 最大化显示 YJ-Pocket-Desktop 页面
  ├─ 状态/缩略图缓存写入系统 userData，不写入应用包
  └─ 窗口关闭时结束内置服务
Renderer（无 Node 集成）
  ├─ 先加载约 74 KB 的 TypeScript 前端、Finder、媒体窗口和 i18next
  └─ 首屏可操作后再加载独立 Three.js 场景代码块；静止时停止绘制
```

Electron 不打开外部浏览器。网页开发模式使用 `npm start` 对应的 `http://127.0.0.1:8765/`；本轮 UI 预览使用 `npm run preview` 对应的 8766，两者都会先重建 `dist`。Electron 在 47000–48019 范围选取端口，遇占用便重试，避开 Chromium 禁止访问的低端口。

此电脑的 Code Integrity 事件 3077 曾报告未签名 EXE 未达到企业签名级别。旧 `.cmd` 启动链已归档，不再是产品入口；源码模式可在安装 Node.js 后运行 `npm start`。若要在同一企业策略下运行 Electron 便携包，需要组织信任的证书完成签名与分发。

## 路径与迁移

- 静态页面与编译代码随应用包只读分发；设置、缩略图与转换结果存入系统用户数据目录。
- 品牌改名使系统用户数据目录随应用名变化；首次运行 1.2.0 时，在新设置文件不存在的条件下，优先复制旧 `YJ Desktop` 用户数据目录中的设置，再尝试项目内旧缓存。原设置保留，不移动媒体和密钥。
- 本机 Windows 首次启动优先使用独立素材库 `D:\YJ-Media`，并读取已有 `.yj-cache/settings.json`；存储的旧项目根路径或项目内 `media` 路径会映射到新素材库。其他系统在代码目录同级有 `YJ-Media` 时也优先使用，否则初始打开用户音乐目录，可在设置改路径。
- 录音档案默认位于同一媒体根路径下的 `Recordings/IPhone-Voice`；显式 `YJ_VOICE_ROOT` 可覆盖。普通音频从 `Music` 分类读取，录音不混入音乐列表。详见[统一素材库规格](media-library-migration.md)。
- MiniMax Key 沿用用户主目录 `.mmx/config.json`；打包文件中没有 Key。

## 窗口与边界

- 单实例：重复打开聚焦已有窗口。
- `nodeIntegration=false`、`contextIsolation=true`、`sandbox=true`；不向页面暴露 Electron/Node API。
- 只加载本机服务；拒绝新窗口和跨站导航。外部链接只接受明确的 `https:`/`http:`，交给系统浏览器。
- 使用现有文件路径限制和范围请求；媒体控制仍由真实文件驱动。

## 验收

1. Windows 便携 EXE 在没有全局 Node 依赖的状态打开最大化桌面；关闭应用后内置服务释放端口。当前设备因企业签名策略未完成此项。
2. 与浏览器模式并存时，两者能分别打开，且媒体路径/设置保持一致。
3. 直接启动两次只显示一个 Electron 窗口。
4. Windows 实测 Finder、设置、图片/音频/视频播放和录音档案；macOS/Linux 包在各自系统完成同样验收后才能标为已验证。
