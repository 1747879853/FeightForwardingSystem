# 海运出口-合同号-2026-07-24

## 背景意图

- 业务表 `TransportOrder` 新增可空合同号 `ContractNum`（string，最长 64），海运出口新建/编辑/列表/详情/复制/关键字检索需同步支持。
- 同批完善基础信息头部「归属组织」：由只读文案改为按销售绑定的 `UserOrgSelect`，支持完整组织路径回显。

## 核心逻辑变更

- API：`TransportOrderAddDto` 增加 `contractNum`；列表查询 `GetPagedListParams` 增加 `ContractNum` 模糊筛选。
- 表单：基础信息在订舱编号后增加合同号输入（`maxlength: 64`）；`flattenDetail` / `buildSeaExportDto` 经 `transportOrder.contractNum` 读写。
- 列表：新增 `transportOrder.contractNum` 列与 `ContractNum` 搜索项；关键字占位文案追加「合同号」。
- 复制：确认摘要展示源票合同号；入库清空由后端负责（与主提单号、订舱编号一并置空）。
- 归属组织：头部改用 `UserOrgSelect`（按干系人销售 `salesUserId`）；`formatOrgPathLabel` 拼接完整公司名；`selectedItems` 兜底编辑回显；`clearOnUserChange` 仅在「切换用户」时清空，首次赋值/回显不清空。

## 避坑指南

- 字段在 `TransportOrder` 上，经嵌套 `transportOrder.contractNum` 读写，不在 `SeaExport` 主表。
- 后端需自行在 `App_TransportOrders` 增加可空列 `ContractNum nvarchar(64)`（本次前端未含 migration）。
- 复制时合同号与主提单号、订舱编号一并清空，避免沿用原票合同号。
- 列表「所属公司」仍展示 `orgs[0].name`；表单「归属组织」绑定末端 `orgId`，勿混淆。
