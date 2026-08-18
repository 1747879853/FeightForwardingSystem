---
title: UserSelect 全量缓存与干系人按公司过滤
module: 通用组件 / 海运出口 / 海运进口 / 空运出口
author: auto-doc-sync
last_updated: 2026-08-19
---

# 背景意图

干系人下拉原先分页远程搜索，选了归属组织后再按组织收窄候选时，`ApiComponent` 会先清空 options，已选人（含客户默认干系人）容易显示成 id。同时希望全站 `UserSelect` 一次拉全量、后续搜索走前端，并让缓存层可被其它 biz-select 复用。

# 核心逻辑变更

- 新增通用 `createBizSelectCache`：内存 + localStorage（品牌+用户隔离）；`userSimpleListCache` 的 `staleTime=0`，每次 `ensure()` 先用旧列表再静默刷新，成功才覆盖、失败保留旧缓存；登出 `clearAllBizSelectCaches`。
- `UserSelect` 改为 `userSimpleListCache` + `useCachedSelect`：`GetUserSimplePagedListAsync` 以 `pageSize=1000` 翻页拼全量；关键词 / `userAttribute` / `companyIds` 前端过滤；已选项 pin 进 options。
- `UserSimpleDto` 增加 `userAttribute`（位掩码）与 `companyIds`（所属公司 id 列表）。角色筛用 `userAttribute`；公司筛用 `companyIds` 与组件入参求交，不再查组织路径。
- 海出 / 海进 / 空出干系人传入 `companyIds`：未选归属组织 = 当前登录用户各公司；选了组织 = 该销售组织所属公司。客户默认干系人回填逻辑不变，不因过滤被清空。

# 避坑指南

- **不要把 `companyIds` / 关键词放进会触发 `ApiComponent` 重新请求的 params**，否则 `refOptions = []` 会把已选 label 打成 id。当前 `UserSelect` 已直绑 `Select`。
- **已选人必须 pin**：过滤后的候选可以变少，但当前值对应 option 必须留着。
- **空 `ids` 的 `GetUserListByIdsAsync` 会返回全量用户**；回显兜底必须显式传 id，且比较 id 用 `String()`，禁止 `Number(id)`。
- 公司过滤用 `UserSimpleDto.companyIds` 与组件入参求交；旧缓存无该字段会把人滤掉，故缓存 `version` 已升到 2 强制重拉。
- `userAttribute` 未返回时不按角色筛，避免空列表。
