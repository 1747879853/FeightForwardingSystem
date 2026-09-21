---
title: 归属组织下拉静默刷新
date: 2026-09-22
module: shared
---

# 背景意图

账号新绑公司抬头后，海出头部「归属组织」在退出重登、选销售后仍可能是旧选项，只有整页刷新才出现。根因是 `GetAllUserOrganizationsAsync` 的模块级 map 一次加载后永不过期，且登录/登出不清这份缓存。

# 核心逻辑变更

- `loadAllUserOrganizations` 对齐 UserSelect：已有快照立刻返回，后台静默重拉，失败留旧 map；登出/登录 `reset` 并丢弃过期请求。
- `UserOrgSelect` 选销售、打开下拉、缓存被清空时会再拉；登录不再预拉组织 map。
- 字段权限仍在登录时重拉；组织树 promise 登录/登出作废。

# 避坑指南

- 这不是 UserSelect 名单缓存。归属组织按 `salesUserId` 从组织 map 筛选项。
- 人不重新登录、也不选销售/打开下拉时，选项可能仍是旧的。
- 登录过期弹窗重登且表单 KeepAlive 时，销售 id 不变则靠缓存清空后的下拉重拉，不会在登录接口里预拉。
