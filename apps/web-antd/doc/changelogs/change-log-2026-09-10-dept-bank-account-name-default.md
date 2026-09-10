---
title: 公司银行账户新增时账户名称默认带出公司名称
date: 2026-09-10
module: system / dept
---

# 背景意图

TAPD #0953：组织管理给公司新增银行账户时，「账户名称」为空，测试每次都要手填。日常账户名称就是公司名称。

# 核心逻辑变更

- `dept/list.vue` 打开新建弹窗时，把当前公司 `displayName` 一并传入。
- `bank-account-modal.vue` 新建分支在 `resetForm` 后写入 `accountName`；编辑仍按详情回填，不覆盖已有账户名称。

# 避坑指南

- 不要在编辑回填路径套公司名称默认值，否则会改掉历史账户名称。
- 公司名称优先取详情 `selectedOrgDetail.displayName`，树节点名作兜底。
