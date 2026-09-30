# 统一素材库目录与迁移

状态：2026-09-30。已迁移 DJI Action、DJI Flip 和 iPhone 录音；iPhone 相册待提供来源路径。应用的唯一默认媒体根路径为 `D:\YJ-Media`，与代码目录 `D:\YJ-Desktop` 同级。用户可见目录采用 Ubuntu 用户文件夹的首字母大写命名；代码中的 `photos`、`videos` 等小写值只是内部入口标识。

## 目录结构

```text
YJ-Media/
├─ Pictures/
│  ├─ DJI-Action/DJI-ZhouShan/
│  ├─ DJI-FLIP/vlog/
│  └─ iPhone/                  # 相册来源确定后迁入
├─ Videos/
│  ├─ DJI-Action/DJI-ZhouShan/
│  ├─ DJI-FLIP/vlog/Proxy/
│  └─ iPhone/                  # 若相册含视频
├─ Music/
└─ Recordings/
   └─ IPhone-Voice/           # 录音、HTML、assets、_transcripts 整体保留
```

| 原来源 | 分类规则 | 迁移方式 |
| --- | --- | --- |
| `DJI-Action/DJI-ZhouShan` | JPG/DNG → Pictures；MP4/LRF → Videos | 保留设备及拍摄目录；同名 MP4 与 LRF 留在一起 |
| `DJI-FLIP/vlog` | HEIC/JPG/JPEG → Pictures；MOV/MP4 → Videos | 保留设备、vlog 和 Proxy 子目录 |
| `IPhone-Voice` | 全部 → Recordings | 整目录移动，保持页面、录音和对话稿的相对路径 |
| iPhone 相册 | 照片 → Pictures；视频 → Videos | 当前来源目录尚未定位；定位后按原相册层级迁入 |
| `Music` | 音频 → Music | 目前为空，只建立分类目录 |

`app/assets/media-archive` 是应用图标，`build` 是打包图标，`docs/specs/reference` 和 `docs/ui` 是设计参考；`.yj-cache` 与 `dist` 是生成物或构建物。它们都不属于用户媒体素材库。

## 引用和兼容

Finder 的默认根路径改为 `D:\YJ-Media`。旧设置如果指向代码目录或其中暂存的 `media`，启动时切到独立素材库；用户自行指定的其他路径保留。画廊、视频、音乐分别扫描 `Pictures`、`Videos`、`Music`，录音入口读取同一媒体根路径下的 `Recordings/IPhone-Voice`，转录脚本默认读取该录音目录。显式配置的媒体路径和转录命令的 `--root` 仍可用于其他设备或迁移场景，但不再是默认的分散路径。

应用静态图标继续从 `app/assets/media-archive` 加载。界面翻译在 `src/locales`，构建时打入应用脚本；这些引用不随媒体移动。网页模式重启并重新构建后读取新路径；旧便携包内的代码不会自动更新，需要重新打包。
Windows 便携包只包含应用代码与静态图标，不打包 `D:\YJ-Media`。复制或更新 EXE 时，素材库可以独立保留；若换机器或换盘符，在设置中指定新素材根路径即可。

## 执行与验收

本次迁移先盘点扩展名、数量与字节数，检查目标冲突与符号链接，再在同盘移动原件；录音档案整目录移动以保持相对引用。一次性迁移脚本不再作为新安装步骤，随旧版 `dist/` 归档清理。后续导入 iPhone 相册时须先确认来源与格式，再单独执行并核对文件数、字节数。

已迁移 DJI 素材 395 个文件、43,083,499,552 字节（照片分类 216 个，视频及 LRF 分类 179 个）；iPhone 录音档案 1,869 个文件、5,509,399,801 字节。原来与代码同级的 `DJI-Action`、`DJI-FLIP`、`Music`、`IPhone-Voice` 已清空移除。Finder 返回四个分类目录；照片和视频样本按新路径获得 HTTP 206，录音首页及脚本资源返回 HTTP 200，转录脚本以新默认路径完成单条 dry-run。iPhone 相册尚未定位，因此这些数量不是完整素材库总量。

界面当前返回可浏览照片 122 个、视频 93 个，少于磁盘文件数。差额包括 DNG 原片、LRF 代理、以 `._` 开头的设备元数据文件及空文件；这些文件被保留在素材库中，但不作为独立的媒体卡片展示。

DNG 原片与 LRF 代理文件会妥善保留；当前网页界面尚不保证能直接预览 DNG 或播放 LRF，LRF 不作为独立视频作品展示。
