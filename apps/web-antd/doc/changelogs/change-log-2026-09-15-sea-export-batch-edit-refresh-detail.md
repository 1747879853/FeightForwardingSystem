---
title: 批量修改后缓存详情页重拉
date: 2026-09-15
module: sea-exports
---

# 背景意图

海运出口编辑页 KeepAlive：列表批量改完再点进之前开过的票，缓存实例不会走 `onMounted`，会一直显示改前的数据。

# 核心逻辑变更

1. **打标：** `BatchEditAsync` 成功后 `markEntitiesShouldRefresh('SeaExport', ids)`，按票 id 写入 `sessionStorage`。
2. **基础信息 Tab：** Form `onActivated` 发现标记则 `loadEditData`，并 `emit('saved')` 联动费用/更改单。
3. **其它 Tab：** 工作台 `onActivated` 自己 `DetailAsync` 更新 `savedDetail` 与页签标题；标记留给切回基础信息时 Form 再清。
4. **清标：** `loadEditData` 一开始就 `consume`，避免首屏挂载与 KeepAlive 激活连打两次。

# 避坑指南

- 不要在每次 `onActivated` 无条件重拉，否则切费用再切回基础信息会冲掉未保存草稿。
- 批量改过的票再进缓存详情会按库内最新覆盖表单；该票上未保存的本地改动会丢。
- 编辑页已关掉则走 `onMounted` 本身就会拉详情，标记只是顺手清掉。
