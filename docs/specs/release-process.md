# 版本与公开发布

应用版本以根目录 `package.json` 的 `version` 为唯一来源；`package-lock.json` 同步更新，安装包名自动包含版本号。采用语义化版本：不兼容变更升 major，新增功能升 minor，兼容修复升 patch。每次发布在根目录 `CHANGELOG.md` 记录用户能感知的变化。

当前版本是 `1.2.3`，应用展示名与包名是 `YJ-Pocket-Desktop`。代码仍在历史路径 `D:\YJ-Desktop`，用户媒体在同级的 `D:\YJ-Media`；品牌改名不触碰这两个目录。`dist/` 只保留当前编译结果和最新安装包，不进入 Git。公开仓库为 [yangjingo/YJ-Pocket-Desktop](https://github.com/yangjingo/YJ-Pocket-Desktop)，当前 Windows 包因未完成目标设备启动验收，以预发布版提供。历史设计参考、草图与截图仍由 `.gitignore` 排除；开发入口和发布包均从同一份源码构建。

发布流程：

1. 使用 `npm version <major.minor.patch> --no-git-tag-version` 更新两个包清单，并补充 Changelog。
2. 运行 `npm run lint`、`npm run check`、`npm test`、`npm run build`，在目标操作系统运行相应的 `npm run dist:*`，核对包内文件及实际启动。
3. 确认 Git 仅包含源码、文档、构建所需的小型原创静态素材和配置；`D:\YJ-Media`、本地缓存、密钥、转录内容、私人截图、Node 运行时及 EXE 不提交。逐项复核参考图和历史截图的授权/隐私后才能公开。
4. 在发行提交上创建 `v<version>` 标签。公开源码采用根目录的 MIT `LICENSE`；推送前检查第三方参考图与隐私内容。安装包通过 GitHub Releases 单独上传。

Windows 便携包在当前设备仍受代码完整性策略限制，构建成功与包内核对不等于本机启动验收。

此工作区所在卷不记录文件所有权，本机 Git 可能提示 `dubious ownership`。仅对单次命令使用 `git -c safe.directory=D:/YJ-Desktop ...`，不修改全局 Git 信任配置。公开文档已经移除对未公开参考图和历史截图的失效链接；私人资料仍不随仓库发布。
