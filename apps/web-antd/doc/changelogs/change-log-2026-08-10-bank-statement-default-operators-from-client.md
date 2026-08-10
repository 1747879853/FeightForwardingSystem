# 银行流水 - 付款方默认带出客户绑定操作人

## 背景意图

TAPD #0745：银行流水选付款方后，可核销操作人应默认带出客户管理中绑定的「操作」干系人，减少手工补录。

## 核心逻辑变更

- 付款方（`settlementId`）变更且当前可编辑时，调用 `Client/GetDishonestStakeholdersAsync` 读取 `operations`。
- 用 `buildOperatorRowsFromClientOperations` 按 `userId` 去重生成操作人行（默认干系人靠前），覆盖当前操作人列表。
- 编辑页加载详情时 `pageLoading` 跳过，避免覆盖已保存的 `bankStatementUsers`。
- 快速连选付款方用序号丢弃过期异步结果。

## 避坑指南

- 用登录即可的 `GetDishonestStakeholdersAsync`，勿用 `ClientAdmin/DetailAsync`（权限面更大）。
- 流水创建人本身可核销，此处只补客户绑定的额外操作人员；客户未绑定时会得到空列表。
- 用户主动换付款方会覆盖已选操作人，属预期；勿在详情回填路径再触发。
