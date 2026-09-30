# YJ-Pocket-Desktop 文档导航

更新：2026-09-30。YJ-Pocket-Desktop 的定位是“可以装进口袋硬盘的小巧便携素材搜索和整理器”；当前首页是银色金属的 Three.js 媒体陈列台。1.2.3 Windows x64 便携包已构建并核对资源；本机企业代码完整性策略下仍未完成启动验收，因此以预发布版提供。多盘自动发现和全局搜索在 PRD 中规划，尚未实现。

| 要了解什么 | 从哪里开始 | 状态 |
| --- | --- | --- |
| 产品介绍（英文默认 / 中文） | [English README](../README.md) · [中文 README](../README.zh.md) | 当前能力、路线与 EXE 验收边界 |
| 二次开发与构建 | [开发指南](development.md) · [Development guide](development.en.md) | 本地启动、测试、打包与发布 |
| 宣传片与可编辑工程 | [产品演示](media/yj-pocket-desktop-30s-en.mp4) · [制作说明](media/promo/README.md) | 成片、截图、音乐与 Remotion 工程统一在 `docs/media/` |
| 产品范围与待办 | [产品需求 PRD](specs/PRD.md) | 多盘发现、授权索引、全局搜索与安全整理待实现 |
| 轻量快速的实现路线 | [搜索索引技术方案](specs/search-index-architecture.md) | 元数据优先、NTFS 可选加速、其他盘回退及资源预算 |
| 桌面结构与交互 | [设计规格](specs/README.md)、[交互与媒体](specs/interaction-spec.md) | 目标行为；已实现程度见实现对照 |
| 视觉规则与当前截图 | [视觉系统](specs/visual-system.md)、[3D 媒体陈列台](ui/object-archive-3d.md) | 当前设计和浏览器验收 |
| 功能与交付差距 | [实现对照](specs/implementation-map.md)、[Electron 分发](specs/electron-distribution.md) | 现状、待实现项和平台验收边界 |
| 视觉研究 | [UI 研究索引](ui/README.md) | 来源、设计手册和实现规则 |

## 版本与证据

- **当前界面**：银色升降桌、五件不同的 Three.js 物件、一体式 deck 与 Finder 截图见[3D 媒体陈列台](ui/object-archive-3d.md)。Finder 内部仍可使用 [`app/assets/media-archive/`](../app/assets/media-archive/) 的银灰 SVG。浏览器界面已验收；Windows 包的文件与资源已核对，运行和 macOS/Linux 跨平台验收仍未完成。
- **历史界面**：[媒体归档桌面](ui/media-archive-desktop.md)保留五枚同形 SVG 文件夹阶段；[早期前端验收](ui/frontend-qa.md)记录更早的内联 SVG 设备图标阶段。这些截图不能代替当前版验收。
- **本地原始参考**：用户给定素材与 Gemini 原型在 `docs/specs/reference/`，设计草图在 `docs/ui/design/`，历史截图在 `docs/ui/screenshots/`。这些目录暂不进入 Git；历史文档里的本地截图链接仅在完整工作区可用，公开前需用获准素材替换或移除。

## 下一步

1. 用当前源码在桌面与窄屏继续审查 UI/UX，按[3D 媒体陈列台验收](ui/object-archive-3d.md)记录问题。
2. 按 [PRD](specs/PRD.md) 的 M1/M2 阶段实现多盘发现、授权索引及跨盘关键词/日期检索。
3. 在允许运行未签名应用的 Windows 环境完成新包启动与媒体回归。macOS/Linux 需在对应系统分别构建和验收，详见[分发规格](specs/electron-distribution.md)。
