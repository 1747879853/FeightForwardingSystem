---
title: 海运出口干系人默认展示优化与委托单位/起运港必填
date: 2026-07-11
type: Feature
scope: apps/web-antd
module: 海运出口 / 基础信息表单
---

# 背景意图

1. 新建/编辑页右侧干系人面板需固定展示销售、商务、操作、客服、单证五个岗位，即使尚未选人岗位行仍保留。
2. 委托单位、起运港为业务必填项，需在表单 label 展示必填标识并在保存时校验。
3. 新建态选择委托单位后，应优先带出客户已绑定的干系人；操作/单证/客服若客户未绑定则兜底当前登录账号。
4. 海外客服不应默认出现在干系人面板，仅当编辑态详情已有分配人员时才展示。

# 核心逻辑变更

1. **`defaultOrderUsers` 收敛为五角色**：移除海外客服默认行；新建态仍保留操作/单证/客服的当前账号兜底（`defaultCurrentUserRoleSet`）。
2. **编辑态过滤空海外客服**：`createOrderUserRows` 在回填详情时过滤「海外客服且无有效 userId」的行；用户仍可通过「+ 添加角色」手动补录。
3. **委托单位联动干系人**：`use-order-users.ts` 新增 `applyClientDefaultOrderUsers`，从 `ClientDto` 的 `sales/customerServices/operations/documentations` 取 `isDefault`（无则第一个）回填对应角色；操作/单证/客服未绑定时写入 `currentUserId`。
4. **`form.vue` 监听委托单位变更**：新建态 `clientId` `onChange` 调 `getClientDetail` 后调用 `applyClientDefaultOrderUsers`；编辑态与详情回填抑制期（`suppressServiceTypeLinkage`）跳过，避免覆盖已保存干系人。
5. **必填 schema**：`data.ts` 为 `clientId`、`polId` 增加 `rules: 'selectRequired'`，与 `portFormApi`/`basicInfoFormApi` 保存校验联动。

# 避坑指南

- **编辑态勿自动覆盖干系人**：委托单位变更的默认回填仅 `!isEdit` 生效；编辑页改委托单位只联动服务项目，不重写 `orderUsers`。
- **商务不在客户干系人维度**：客户 API 仅维护销售/客服/操作/单证四类，`applyClientDefaultOrderUsers` 不改动商务行已有值。
- **清空委托单位**：`clientId` 清空时仍会对操作/单证/客服执行当前账号兜底，销售/商务保持空或原值。
- **海外客服与添加角色**：默认不展示不等于禁止录入；有历史数据或手动添加时正常提交。
