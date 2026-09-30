# YJ-Pocket-Desktop · 轻量搜索索引技术方案

状态：2026-09-30，待实现的技术设计。目标是借鉴 Everything 的**元数据优先、按文件系统能力选最快路径、增量维护**，而不是依赖或复制 Everything。产品范围和用户授权规则见 [PRD](PRD.md)。

## 设计依据与现状

Everything 官方说明：它始终索引名称与路径，大小、日期等信息可以按需加入；Windows NTFS 可用 USN Journal 保持更新；文件夹索引适用于其他磁盘但比原生 NTFS 路径慢。其官方 FAQ 给出的约 100 MB 内存、45 MB 磁盘 / 100 万文件是 **Everything 自身在其条件下的数字，不是本产品的实测或承诺**。[索引说明](https://www.voidtools.com/en-us/support/everything/indexes/) · [文件夹索引](https://www.voidtools.com/support/everything/folder_indexing/) · [FAQ](https://www.voidtools.com/faq/)。

当前 `src/server/http.ts` 的 `/api/library` 在缓存失效或手动刷新时递归遍历类别目录、对候选文件 `stat`、收集结果再排序；短时间重复请求复用结果。前端 `src/client/desktop.ts` 对已加载列表做文件名过滤。它适合现有小素材库，但不是跨盘的常驻索引。改名前 Windows 1.1.0 便携包为 101,003,149 字节，新 1.2.0 包为 101,004,828 字节，两者均约 96.3 MiB；**首屏加载减少并不等于 Electron 安装包已达到 Everything 的体积**。

## 目标结构

```text
VolumeProvider（只发现卷，不扫描文件）
  → SourceRegistry（卷身份、授权根、排除、在线状态）
  → ScanAdapter（普通目录遍历 / 可选 NTFS 加速）
  → IndexWorker（限速批量写入、断点和增量校正）
  → IndexStore（本机元数据目录，不含媒体原件）
  → SearchService（范围、关键词、类型、日期、分页）
  → Finder / 搜索面板 / 原文件打开
```

HTTP/Electron 主线程只处理请求和状态，扫描、索引、查询放在独立 worker/进程，允许取消、暂停及降低优先级。搜索结果用 `source_id + volume_relative_path` 标识；打开文件前重新确认卷身份、授权范围和真实路径，不能仅拼接旧盘符。旧 `/api/list`、`/api/library` 暂保留，在新索引通过回归验收后逐步切换；索引损坏或未建立时可回到受限的目录浏览。

## 扫描适配器：快路径和可靠回退

| 来源 | 首选机制 | 回退与边界 |
| --- | --- | --- |
| Windows NTFS、用户授权整卷且系统允许读取卷元数据 | 小型可选原生辅助模块通过 `FSCTL_ENUM_USN_DATA` 初始枚举 MFT 记录，以 `FSCTL_READ_USN_JOURNAL` 追增量 | 无权限、无 Journal、Journal ID 改变或旧 USN 被截断时，切换到普通目录遍历/重建；不静默提权或自动安装系统服务 |
| Windows NTFS 的授权子目录，以及 exFAT/FAT/普通外接盘 | `fs.opendir()` 流式、分批遍历授权根；文件变化通知只作加速提示 | 监听溢出、断线、进程未运行期间的变化要按目录校验/重扫；不把监听事件当唯一事实来源 |
| macOS/Linux、网络共享、其他文件系统 | 平台允许的挂载卷发现 + 授权目录的流式遍历 | 平台特有事件监听可后加；M1/M2 不承诺与 NTFS 快路径相同的首扫速度 |

Windows 的卷 GUID 路径用于关联挂载点，不能只用 `E:` 当身份；卷信息、卷 GUID、文件系统类型和用户确认共同决定 `source_id`。GUID 或序列信息不可用/冲突时提示重新绑定。[Microsoft 卷 GUID API](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumenameforvolumemountpointw) · [卷信息](https://learn.microsoft.com/en-us/windows/win32/fileio/obtaining-volume-information)。

NTFS 快路径是**可选加速器**，不作为便携使用的前提；只有用户授权整卷索引才可读取整卷 MFT。授权仅限某个文件夹时不得先枚举整卷再丢弃范围外名称。Microsoft 文档分别定义了 [MFT 枚举](https://learn.microsoft.com/en-us/windows/win32/api/winioctl/ni-winioctl-fsctl_enum_usn_data) 与 [USN 读取](https://learn.microsoft.com/en-us/windows/win32/api/winioctl/ni-winioctl-fsctl_read_usn_journal)；监听缓冲区溢出时应重新枚举而不是继续相信事件流。[目录变化 API](https://learn.microsoft.com/en-gb/windows/win32/api/winbase/nf-winbase-readdirectorychangesw)。

## 索引内容和查询

1. 第一层仅存 `source_id`、父目录 ID、原始文件名、规范化搜索名、相对路径或目录关联、文件类型、大小、修改时间、在线状态、扫描版本。目录名只存一份；不存完整媒体、缩略图、EXIF 全字段或转录正文。可预览媒体的丰富元数据在展示时异步提取并单独缓存。
2. 选用一个可事务写入、可恢复的本地索引存储层（优先评估 SQLite）。先用 10 万、100 万条中文/英文混合样本比较普通列扫描、名称索引和 FTS/trigram 的包体积、索引大小、首批结果延迟；**不预先把所有路径做三元组倒排**，避免索引膨胀。具体索引策略以基准数据定案，接口 `IndexStore` 不绑定 UI。
3. 写入批次有 `scan_run` 与 checkpoint。只有一批成功提交后才推进游标；重命名关联文件 ID/父目录 ID，删除标记与重扫核对，离线磁盘保留索引但结果标离线。USN Journal ID 变化或 `ERROR_JOURNAL_ENTRY_DELETED` 时必须重建该卷索引，不沿用不完整增量。[Microsoft USN 结构说明](https://learn.microsoft.com/en-us/windows/win32/api/winioctl/ns-winioctl-read_usn_journal_data_v1)。
4. 查询默认名称和相对路径子串，中文可用、忽略大小写；提供源/类别/日期过滤，返回首批 50 条及继续游标。排序默认相关性与稳定路径次序，不能先把全量结果传给前端。取消过时查询；索引正在构建时显示已完成范围和进度，不把部分结果伪装为全量。
5. `GET /api/sources`、`POST /api/sources`（显式授权）、`GET /api/index/status`、`GET /api/search` 是拟议接口；参数/响应先写契约测试，再切换前端。路径校验复用当前本地服务的越界保护，且对符号链接/重解析点做再次检查。整理写操作不在搜索 API 内。

## 体积和速度的硬门槛

先保留当前 Electron 壳，测量 **安装包总体**、**索引模块增量**、**索引数据库**、**运行时 RSS** 和 **查询延迟** 五项，不用单一“快”字代替数据。现有包约 96.3 MiB 是基线；M2 新增模块和原生辅助件的打包增量目标 ≤ 5 MiB，若超出需说明收益或换实现。10 万条本机 SSD 元数据索引后，关键词查询 p95 ≤ 200 ms 返回首批 50 条（与 PRD 一致）；100 万条的数据库体积、峰值内存和首扫时间必须实测披露，不能借用 Everything 的数字。硬盘、exFAT、网络盘分别测量，用户可暂停首扫。

## 已完成的短期优化与验证

1. 首屏 UI 与 3D 场景拆成两个 ESM 文件：当前 `dist/web/app.js` 为 75,515 字节，`dist/web/chunks/scene.js` 为 560,310 字节（拆分前单文件约 620 KB）；场景延至首屏可交互后下载、解析和初始化，静止时不再持续绘制。此前浏览器 390px 视口下场景进入 `ready`，无横向溢出，静止 600 ms 内观察到 0 次新的 `requestAnimationFrame` 请求。该检查仅证明所测浏览器会话，不等于所有 GPU 上的帧率验收。
2. 媒体目录改为 `opendir()` 流式遍历、每批最多 256 个候选文件、全局 8 个并发 `stat`；类别列表缓存 10 秒，超过 20,000 条不持续保留，手动刷新绕过缓存。UI 用请求序号丢弃旧响应，避免快速切换时闪回旧内容。
3. 在当前 2,264 文件的本地素材库上，图片/视频分别返回 122/93 条；单次浏览器服务会话里 7 次强制重扫的稳态中位耗时约 10/7 ms，紧邻的缓存请求约 3 ms。数字受操作系统文件缓存影响，不外推到百万级、机械盘或跨盘索引。

如果“小巧”被进一步定义为整个可执行文件只有几十 MiB，单靠改索引无法解决目前约 96 MiB 的 Electron 基线；需单独做原生窗口/系统 WebView 的原型与迁移评估，并比较系统依赖、便携性、跨平台、签名和现有 Three.js/UI 兼容性。未通过评估前不替换现有运行时。

## 实施顺序和验收门

1. 先做基准：记录当前包大小、现有 `/api/library` 在 2,264 个文件上的扫描耗时、目标设备的 CPU/磁盘类型；生成 10 万/100 万条**合成文件名**用于索引与查询测试，不把私人素材复制进仓库。
2. 实现 `VolumeProvider`、`SourceRegistry` 和权限/身份契约；先在普通目录遍历路径交付可用跨盘索引。插拔与盘符交换测试通过后，才接搜索 UI。
3. 实现持久索引、增量校正、状态与分页查询；以合成数据 + 真实已授权素材验收延迟、包增量、崩溃恢复和隐私边界。
4. 最后尝试 NTFS 原生快路径；必须用无管理员权限、Journal 丢失、不同卷占用同盘符、整卷/子目录授权分别验收。快路径失败只影响速度，不影响正确性。

当前没有索引数据库、NTFS 辅助模块或跨盘搜索 API；本文件是实施规格，不是已完成声明。
