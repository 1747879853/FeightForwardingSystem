# 检查更新改为比对构建产物 version.json

## 背景意图

线上 IIS 对 `HEAD /` 的 `etag` / `Content-Length` 会随静态压缩缓存冷热切换而变化，文件未发版也会弹出「新版本可用」。检测更新改为拉取构建时生成的小文件 `version.json`，只比资源指纹。

## 核心逻辑变更

- 构建插件 `vite:emit-version-json` 在应用 `build` 时写出站点根目录 `version.json`：`entry` 为入口 JS 路径（如 `/jse/index-index-xxx.js`），`id` 为本次 js/css 文件名排序后的短哈希。
- `CheckUpdates` 不再 `HEAD /` 读 etag，改为 `GET {base}version.json?_t=`，比对 `id`（没有则用 `entry`）。
- `localhost` / `127.0.0.1` 仍不检测。

## 避坑指南

- 必须重新打包并部署带 `version.json` 的产物；旧包没有该文件时请求失败，静默不弹窗。
- 比的是 JSON 正文，不是响应头；IIS 压缩导致体积/etag 抖动不会误报。
- 只改 `public` 静态图、未进入 js/css 产物的文件时，`id` 可能不变。
