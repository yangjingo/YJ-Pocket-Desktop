# YJ-Pocket-Desktop

English · [简体中文](README.zh.md)

<img src="build/icon.png" alt="YJ-Pocket-Desktop silver metal emblem" width="120" />

A creative desk you can carry on a pocket drive. YJ-Pocket-Desktop is a local-first media browser with a restrained, metallic 3D workspace. Photos, videos, music, and recordings have distinct places to land. The longer-term ambition is to make work scattered across drives fast to find and safe to organize.

[![Watch the 30-second product demo](docs/media/yj-pocket-desktop-poster-en.webp)](docs/media/yj-pocket-desktop-30s-en.mp4)

[Watch the 30-second English demo (MP4)](docs/media/yj-pocket-desktop-30s-en.mp4) · It uses synthetic demo media, not personal files. Search in the video filters filenames in the current folder only.

## What works today

- Browse one selected media root, including folders and the `Pictures`, `Videos`, and `Music` categories. The recording archive defaults to `Recordings/IPhone-Voice`.
- Preview images and play browser-supported audio and video. With local `ffmpeg`, some incompatible videos can be converted to a playable copy while the original stays on disk.
- Filter filenames in the Finder’s **current folder**, switch between English and Chinese, and change the media root in Settings.
- Run the interface locally in a browser; a Windows portable package has also been built, pending launch validation.

The current version is `1.2.3`. A Windows portable package has been built and its contents verified, but an enterprise code-integrity policy on this machine prevented launch validation. macOS and Linux have not been tested on their respective systems. **Automatic multi-drive discovery, cross-drive indexed search, and in-app safe organization are planned, not shipped.** See the [product requirements and milestones](docs/specs/PRD.md).

## Your media stays yours

The app and your files live separately. `D:\YJ-Media` is the default library on the current development machine, not a required location; you can select another root in Settings. Personal media and indexes are not bundled with the app or the public source. Browsing and filename filtering run locally, and the local service binds only to `127.0.0.1`. Optional recording transcription calls an external service only when explicitly invoked.

The project takes inspiration from Everything’s responsiveness, but it neither integrates Everything nor claims equivalent cross-drive search or package size today. See the [index architecture](docs/specs/search-index-architecture.md) for the proposed approach and measurable targets.

## Get it or help build it

- Windows package: [v1.2.3 pre-release](https://github.com/yangjingo/YJ-Pocket-Desktop/releases/tag/v1.2.3). The unsigned build still needs launch testing on a Windows machine that allows it.
- To run from source, contribute, or build a package, follow the [development guide](docs/development.en.md).
- Explore the [documentation index (Chinese)](docs/README.md), [promo project](docs/media/promo/README.md), and [changelog](CHANGELOG.md).

The code is [MIT-licensed](LICENSE). Personal media, secrets, caches, and `dist/` build output are excluded from the public repository.
