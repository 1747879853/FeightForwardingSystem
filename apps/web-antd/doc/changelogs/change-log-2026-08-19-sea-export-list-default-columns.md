---
title: 海运出口台账默认列改为可维护配置文件
module: 海运出口
author: auto-doc-sync
last_updated: 2026-08-19
---

# 背景意图

海运出口列表列很多，无用户列配置时会全部摊开。希望有一份可手改的默认列清单：没存过列设置时按它显示和排序；用户自己保存过的列设置仍优先。对应 TAPD #0824 截图里的精简台账。

# 核心逻辑变更

- 新增 `views/sea-export-admin/list-column-defaults.ts`：默认源是与用户设置 `table_config_SeaExportList` 同款的 `setting` JSON（`visibleColumnKeys` / `columnVisibility` / `columnFixed` / `columnWidths`，不含 `_debug`）。
- `useColumns` 仍经 `applySeaExportListDefaultColumns` 套一层，避免 persist 异步回来前先闪全列。
- `list.vue` 覆盖 `columnPersist.load`：有用户设置则原样返回（带 `id`）；没有则返回 `{ setting }` **不带 id**，会应用默认但不会写成用户设置，直到用户改列才 `add`。
- 列设置「恢复默认」改为尊重列定义快照（`_columnDefaultVisible` / `_columnDefaultFixed`），因此会回到本文件，而不是把所有列重新勾上。

# 避坑指南

- **改默认列只改这份 JSON**，不要在 `data.ts` 里散落 `visible: false`。维护时从用户设置复制 `setting`，去掉 `_debug` 后整段替换。
- 键必须是 `field:xxx` / `type:checkbox`，与列持久化稳定键一致；写了不存在的 key 会被忽略。
- 配置里没有的新列保持 `useColumns` 原定义，不会被默认隐藏。
- 已经保存过列设置的账号看不到新默认，需在列设置里恢复默认。
- load 无用户命中时会跳过 localStorage 列兜底，避免旧的全列本地缓存挡住新默认。
