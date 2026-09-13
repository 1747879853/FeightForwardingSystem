---
title: version.json 写入 git commit 与构建时间
date: 2026-09-13
module: shared
---

# 背景意图

线上 `version.json` 原先只有资源指纹 `id` 和入口 `entry`，够检查更新，对不上 git。别人发了没写 TAPD Wiki 时，发布记录无法从「上次已上线的那次构建」往回算差异。

# 核心逻辑变更

1. **构建产物：** `vite:emit-version-json` 在保留 `entry` / `id` 的同时写入 `commit`（`git rev-parse HEAD` 的 40 位 SHA）、`builtAt`（UTC ISO）。工作区有未提交改动时再写 `dirty: true`。
2. **检查更新不变：** 运行时仍只比 `id`（没有则 `entry`），多出来的字段不影响弹窗。
3. **发布记录：** 先拉各品牌线上 `version.json`；有 `commit` 则 `git log <线上commit>..HEAD` 对齐 changelog；旧包无 `commit` 再回退 Wiki 上一节日期。

# 避坑指南

- 无 git 或 `rev-parse` 失败时不要让构建失败，只是省略 `commit`。
- `id` 仍由本次 js/css **文件名**算出，不是 git SHA；不要用 `commit` 替代检查更新。
- 工作区脏时 `commit` 仍是 HEAD，产物并不等于该提交；Wiki 要标明 dirty。
- 本改动上线前，各品牌线上仍是旧格式，第一次记发布按旧包处理。
