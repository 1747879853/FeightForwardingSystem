# 2026-06-03 jht 字体改为固定 OSS 直连

## 背景意图

- `jht` 字体此前依赖 `GET /services/app/Test/GetOssUrlAsync` 获取签名 URL，链路受后端限流和签名有效期影响。
- 为统一三品牌资源加载策略并降低故障面，将 `jht` 字体切换为固定 OSS 直连方案。

## 核心逻辑变更

- 调整 `src/utils/global-font-loader.ts`：
  - 移除 `getOssPrivateFileUrlByCandidates` 调用。
  - 移除 `objectNames` 候选 Key 配置与 `jht` 分支处理。
  - 三品牌统一按 `https://oss.jiayuebetter.com/<fileName>` 生成字体 URL 并注入 `@font-face`。

## 避坑指南

- 新增或替换字体文件时，需确保 OSS 对象名与 `fontAssets.fileName` 完全一致。
- 如出现字体 404，优先检查 OSS 对象路径和大小写，而非接口签名链路（该链路已移除）。
