# 收费核销 EditAsync 补传 orgId

## 背景意图

后端 `ReceiveSettlementAdmin/EditAsync` 入参已包含 `orgId`，前端编辑保存此前只传 `id` / `settlementTime` / `remark`，与接口契约不一致。

## 核心逻辑变更

- `ReceiveSettlementEditDto` 增加必填 `orgId`。
- `form.vue` / `invoice-form.vue` 编辑保存携带详情回显的 `orgId`；保存前校验组织缺失。
- 编辑页归属组织仍只读展示，不新增可改下拉；提交时原样回传。

## 避坑指南

- 详情未返回 `orgId` 时前端会拦截并提示刷新，勿再省略该字段。
- 明细增删仍走独立接口，不随 `EditAsync` 提交。
