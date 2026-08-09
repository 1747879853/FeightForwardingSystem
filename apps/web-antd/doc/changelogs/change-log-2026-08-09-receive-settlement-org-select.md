# 2026-08-09 收费核销新建增加归属组织选择

## 背景意图

`ReceiveSettlementAdmin/AddAsync` 与 `AddByInvoiceApplicationAsync` 入参 `orgId` 为必填：空或 `<= 0` 报「所属组织不能为空。」；且须为当前登录人直属组织（`UserOrganizationUnit` 完全相等，不按父子）。费用结算/发票结算新建页此前未提交 `orgId`，会导致后端校验失败。

## 核心逻辑变更

- `form.vue` / `invoice-form.vue`「结算信息」增加 `MyOrgSelect`（本人直属组织），新建默认 `getMyDefaultOrgId()`，保存校验并随 `Add*` 提交 `orgId`
- 编辑态只读展示组织路径文案；详情 `ReceiveSettlementDetailDto` 补 `orgId` 用于回显
- 银行流水工作台创建结算面板此前已传流水 `orgId`，本次未改

## 避坑指南

- 选项范围必须是本人直属组织，勿换成全量组织树；否则易触发「所选组织不在数据所属人(本人)所属组织范围内。」
- `EditAsync` 不改 `orgId`，仅新建可写；编辑页勿做成可改下拉
