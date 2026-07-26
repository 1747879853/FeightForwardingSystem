# 业务联系单委托单位详情回显补 selectedItems

## 背景意图

编辑/复制预填时，委托单位 `ClientSelect` 只写入了 `clientId`，未把详情接口返回的 `client` 对象喂给 `selectedItems`，页面回显成 Guid。收发通与海运出口已按 `toSelectedItems(id, name)` 处理，联系单委托单位漏了同口径。

## 核心逻辑变更

- `fillFromDetail` 回填前调用 `bindClientUserLinkage(toSelectedItems(dto.clientId, dto.client?.name))`，用详情 `client.name` 注入 `selectedItems`。
- `bindClientUserLinkage` 支持可选 `selectedItems`，与 `onChange` 同一次 `updateSchema`，避免只更回显时冲掉干系人联动。

## 避坑指南

- `ClientSelect` 编辑回显必须传 `selectedItems`（含 `id` + `name`）；只 `setValues(clientId)` 会显示成 Guid。
- 详情已有 `client` 嵌套对象时优先用，不要为回显名再打客户详情接口。
