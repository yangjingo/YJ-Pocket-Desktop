# 30 秒产品演示

当前英文成片：[YJ-Pocket-Desktop 30 秒演示](../yj-pocket-desktop-30s-en.mp4)（1920 × 1080、30 fps、H.264/AAC）。此前的中文成片是带旧首页标题牌的历史版本，留在本机，不随公开仓库发布；工程仍保留中文时间轴和截图，可按需重新制作。这些是产品界面的宣传展示，不是功能测试录像：画面来自实际运行的本地应用，所示照片和音乐是脚本生成的合成演示素材，不含 `D:\YJ-Media` 私人数据。

镜头节奏：

| 时间 | 镜头 | 信息边界 |
| --- | --- | --- |
| 0–4 秒 | 产品定位 | 便携、本地优先 |
| 4–9 秒 | 银色媒体桌 | 实际桌面 UI |
| 9–14 秒 | 图片画廊 | 分类入口与浏览 |
| 14–19 秒 | 文件名筛选 | 仅当前文件夹，不是全盘搜索 |
| 19–24 秒 | 图片预览 | 本地原文件保持不变 |
| 24–27 秒 | 音频播放器 | 播放本地音频 |
| 27–30 秒 | 品牌收尾 | 不宣称尚未实现的跨盘索引 |

`captions-en.json` 和 `captions.json` 分别是英中文字幕时间轴；`public/screens/en/` 是英文界面重拍的五张截图；`generate-demo-assets.mjs` 生成可重复的演示图片与原创电子配乐。`public/audio/glass-signal.wav` 是可再生输出，不提交 Git；`npm run promo:studio` 和 `promo:render*` 会先自动生成它。演示媒体库在忽略的 `dist/promo-demo-media/`，与个人素材库隔离。

视觉系统直接沿用应用的银色材料层级：浅银 `#f5f5f2`、机身银灰 `#b8b9b7`、石墨色凹槽 `#181919`；暖金 `#d39a42` 仅点亮状态灯。`metal-logo.tsx` 用 Three.js 生成有厚度、倒角与金属光照的品牌徽记，片头片尾共用；场景标题板、画面边框与字幕条采用同一套实体金属与凹面屏语言。动画由 Remotion 帧号驱动，不依赖 CSS 自动动画。

安装包图标以 [build/icon.svg](../../../build/icon.svg) 为源，与片头片尾共享八向星、深色圆形凹面、银色方形机身和单枚琥珀色状态灯。修改后运行 `python scripts/render-app-icon.py` 生成 PNG/ICO；脚本使用 Remotion 浏览器渲染 SVG、Pillow 打包 ICO，无需系统 Cairo 库。

```powershell
npm ci
npm run promo:assets
npm run promo:check
npm run promo:studio
npm run promo:render:en
```

重新拍摄英文界面时，以 `YJ_MEDIA_ROOT=...\dist\promo-demo-media` 和独立的 `YJ_STATE_ROOT` 启动本地服务，再运行 `python docs/media/promo/capture-english.py`；脚本会在隔离状态中选择 English、检查首页标题牌已移除，并分别拍摄桌面、画廊、搜索、预览和音频画面。检查 `dist/promo-capture-en/` 后再转换为 `docs/media/promo/public/screens/en/*.webp`。Remotion 是独立的第三方开发依赖，其使用遵循[官方许可证说明](https://www.remotion.dev/docs/license/faq)；项目 MIT 许可证不改变 Remotion 的许可条件。
