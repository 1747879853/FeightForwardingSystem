---
title: 付费申请附件分组对齐 Add/Edit 全量与 AddAttachments 追加
date: 2026-07-28
---

# 付费申请附件分组对齐 Add/Edit 全量与 AddAttachments 追加

## 背景意图

按后端约定区分三条路径：新建/录入编辑随 `AddAsync`/`EditAsync` 带 `attachmentGroup` 全量绑定；非录入态用 `AddAttachments` 仅追加；详情 `paymentSettlementAttachments` 只读展示，申请侧不增删。

## 核心逻辑变更

1. **`attachment-groups.vue`**
   - 可编辑（新建/录入中）：通用上传拿 `attachmentId` 后只写本地 `attachmentGroup`，等表单保存。
   - 只读追加（已有 id 且非录入）：上传后调 `AddAttachments` 平铺追加，不可删已有。
2. **`form.vue`**
   - `buildAttachmentGroupSubmit` 组装分组入参；新增有文件才带；编辑始终传（可空数组，全量覆盖）。
   - 详情回填 `paymentSettlementAttachments`，卡片下只读列表预览，不参与保存。
3. **与上传关系**：业务接口只绑 `attachmentId`，文件流仍走通用上传服务。

## 避坑指南

- 编辑是「先删后建」覆盖，勿把 `AddAttachments` 当主保存路径，否则本地删除无法生效。
- `paymentSettlementAttachments` 来自关联结算单，申请页不可改，维护在付费结算模块。
