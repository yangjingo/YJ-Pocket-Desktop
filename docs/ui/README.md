# YJ-Pocket-Desktop UI 研究

这里保存本项目的视觉参考、来源边界和落地规则。项目总入口见[文档导航](../README.md)。当前方向是 **Skeuomorphism（拟物）**：让相机、相纸、唱盘、磁带和按键具有可辨认的结构，并让播放、暂停、按下等状态与真实操作相符。Neumorphism 的凸起与内凹光影只作为塑造材质的方法。

## 当前设计与验收

| 文件 | 内容 |
| --- | --- |
| [视觉系统](../specs/visual-system.md) | 当前 3D 陈列台、冷钢蓝灰材质、窗口和动效规则 |
| [3D 媒体陈列台](object-archive-3d.md) | 五件独立 Three.js 物件的历史浏览器验收；1.2.0 性能变化见[索引方案](../specs/search-index-architecture.md) |
| [媒体归档桌面](media-archive-desktop.md) | 上一版同形金属文件夹 SVG 的历史验收记录 |
| [实现规格](implementation-spec.md) | 初始方案取舍、组件规则；当前视觉以 3D 媒体陈列台为准 |

## 来源与历史记录

| 文件 | 内容 |
| --- | --- |
| [播放器参考](music-player-reference.md) | 用户给定图片、结构拆解、当前实现与待验证项 |
| [Inspora 案例](inspora-references.md) | 复古掌机和音量旋钮的原始记录与核验边界 |
| [Smartisan OS](smartisan-os.md) | 锤子手机的拟物设计证据与本项目可借鉴的规则 |
| [灵感来源](inspiration-sources.md) | 用户提供的网站清单、适用任务与使用边界 |
| [早期前端验收](frontend-qa.md) | 内联 SVG 设备图标阶段的视口和操作记录，属历史快照 |
| 本地设计手册（未公开） | 清晰聚焦、一致性、即时反馈、容错和无障碍的审查基准；原草图不随公开源码发布 |

## 参考顺序

1. 先看[播放器图片来源](music-player-reference.md)，确认物件结构和明暗层级。
2. 用 [Smartisan OS 研究](smartisan-os.md)检查图标是否像真实物件，交互是否延续物件动作。
3. 需要更多案例时按[灵感来源](inspiration-sources.md)中的任务路由查找；参考案例不等于可直接复用的素材或代码。
4. 改动后检查桌面与 390px 窄屏、键盘名称、真实媒体状态、`prefers-reduced-motion` 和启动性能。

设计手册的清晰聚焦原则落实到顶栏时，移除了没有实际状态来源的 `xx` 徽章。SVG 草图中的铝板、铣槽和旋钮已经转译为运行界面的统一物件语言；桌面使用独立的透明档案夹 SVG，Dock 和侧栏沿用匹配的物件图标。原稿中的深色大投影没有照搬，界面只保留短距离接触阴影。
