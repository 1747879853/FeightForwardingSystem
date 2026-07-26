---
title: 海运出口干系人改为批量获取用户展示信息
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-26
---

# 1. 背景意图 (Background)

**白话解释：** 海运出口编辑/新建页右侧干系人面板，此前对每个已选人员分别调用 `UserAdmin/GetUserAsync` 拉详情（初始化时 `Promise.all` 并发 N 次，悬停头像再懒加载）。接口返回体含敏感字段，且停用用户与历史单据回显场景并不需要完整用户档案。后端已提供 `User/GetUserListByIdsAsync`（按 id 批量、不按状态过滤、仅展示字段），前端改为一次请求拿齐干系人昵称/启用态/手机/邮箱/组织路径。

# 2. 核心逻辑变更 (Core Changes)

| 位置 | 变更 |
| :-- | :-- |
| `api/system/user-admin.ts` | 新增 `UserInfoDto` / `UserListByIdsQueryDto` 与 `getUserListByIds`；查询参数使用 `paramsSerializer: 'repeat'` 生成 `ids=1&ids=2` |
| `basic-info-form/use-order-users.ts` | `fillOrderUserNames` / `loadOrderUserDetail` 改为走 `loadOrderUserDetailsByIds` 批量拉取；详情缓存类型改为 `UserInfoDto`；启停用读 `enable`；未命中 id 仍走「已删除」兜底 |
| `basic-info-form/form.vue` | 干系人悬停卡片副标题由「账号」改为「组织」（`UserInfoDto` 无 `userName`，改展示组织路径） |

# 3. 避坑指南 (Blockers & Pitfalls)

> [!IMPORTANT] **坑点 1：数组参数必须用 repeat，否则会退化成查全量** `GetUserListByIdsAsync` 空 `ids` 语义是返回全部用户。前端必须 `paramsSerializer: 'repeat'`，且无有效 id 时**不发请求**，避免误拉全量。

> [!IMPORTANT] **坑点 2：按 id 匹配，不要按下标硬对应** 不存在的 id 会被后端静默忽略，返回条数可能少于传入数量；未命中者写入 `orderUserLoadFailedSet` 并展示 `用户{id}（已删除）`。

> [!IMPORTANT] **坑点 3：展示字段与旧详情不完全一致** `UserInfoDto` 不含头像与登录账号；头像统一默认图，副标题改组织路径，启停用字段为 `enable`（非旧接口的 `isActive`）。

# 4. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-26 | `Feature` | 海运出口干系人用户信息改为 `GetUserListByIdsAsync` 一次批量获取，不再逐个 `GetUserAsync` | 初始化与委托单位回填共用 `loadOrderUserDetailsByIds`；单人切换/悬停复用同一批量入口（单 id）；与「登录即可」的轻量 DTO 对齐，避免敏感字段暴露 |
