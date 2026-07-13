# 侧边栏菜单重组与收费核销更名

## 背景意图

产品侧栏菜单需与业务域划分对齐：将原分散的顶级菜单按「航线管理」「操作管理」「费用管理」「财务管理」等分组收纳；同时将「收费结算」统一更名为「收费核销」，与银行流水核销语义一致。

## 核心逻辑变更

### 菜单分组与归属

| 分组 | 子菜单 | 路由模块文件 |
| :-- | :-- | :-- |
| 航线管理 | 运价查询 | `freight-rate.ts`（父级 title 改为「航线管理」，子项「运价查询」） |
| 操作管理 | 海运出口、海运进口 | 新增 `operation-management.ts`，删除独立 `sea-export.ts` / `sea-import.ts` |
| 费用管理 | 对账单、开票申请、付费申请、收费核销 | `fee-management.ts`（原「财务管理」改名；移入收费核销路由别名） |
| 审核审批 | 应收应付审核、付费审批 | `audit-approval.ts`（「付费审核」→「付费审批」） |
| 财务管理 | 付费结算、发票开出、银行流水、费用锁定 | `settlement-management.ts`（原「结算管理」改名；移入银行流水与费用锁定） |
| 公告管理（顶级） | — | 新增 `announcement.ts`，自 `system.ts` 子项提升 |

### URL 保持不变

为兼容已有跳转与书签，以下页面 **path 未改**，仅菜单归属与 title 变化：

- 收费核销：`/settlement-management/receive-settlement`
- 银行流水：`/bank-statement`
- 海运出口/进口：`/sea-exports`、`/sea-imports`
- 费用锁定：`/settlement-management/fee-lock`（自 `/fee-management/fee-lock` 迁移）

### 文案同步

- 路由 title、列表 Tab、权限文案（`auth.json`）、单号字段（`system.json`）、表单/弹窗提示中的「收费结算」→「收费核销」
- 内部 API 命名（`ReceiveSettlement*`）、类型与注释未改，避免破坏契约

## 避坑指南

- **菜单与路由 path 解耦**：收费核销在「费用管理」下展示，但 `activePath` 仍指向 `/settlement-management/receive-settlement`，编辑页高亮正常。
- **权限聚合**：父级 `authority` 需包含全部子项权限码，否则仅有子权限的用户看不到分组父菜单。
- **嵌套路由**：`operation-management` 与 `settlement-management` 内子路由使用绝对 path（如 `/sea-exports`），与 vben `generateMenus` 的 `hideChildrenInMenu` 配合展示为二级菜单项。
- **费用锁定路径变更**：若有硬编码 `/fee-management/fee-lock` 的跳转需改为 `/settlement-management/fee-lock`（本次路由已迁移，视图组件路径未变）。
