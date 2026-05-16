# 变更记录：货代主流程业务文档体系搭建

## 背景意图

- 当前 `web-antd` 已有零散模块文档，但缺少面向产品与测试的端到端业务主流程说明。
- 本次目标是围绕“海运出口 -> 录入费用 -> 付费申请 -> 付费结算”建立可持续维护的模块化文档体系。
- 输出应支持后续继续补充字段来源、状态口径、边界条件等细节。

## 核心技术决策/逻辑变更

- 新增主流程总览文档：`doc/modules/freight-business-overview.md`，统一描述模块关系、角色分工和主流程测试路径。
- 重构海运出口活文档：`doc/modules/sea-export.md`，从历史 UI 小改动说明扩展为完整业务入口与编辑容器说明。
- 新增费用与审核链路文档：
  - `doc/modules/order-fee.md`
  - `doc/modules/fee-lock.md`
  - `doc/modules/expense-audit.md`
- 新增付费与结算链路文档：
  - `doc/modules/payment-application.md`
  - `doc/modules/payment-review.md`
  - `doc/modules/statement-settlement.md`
- 更新模块索引：`doc/MODULE_INDEX.md`，将新增模块纳入统一表格索引并更新时间戳。

## 避坑指南（Gotchas & Constraints）

- 系统中“结算”有多层语义（费用结算状态、付费申请状态、对账单维度），需求与测试设计必须先明确口径。
- 海运出口编辑页存在“有 Tab 标签但未挂载内容”的区块，测试范围应以当前可操作模块为准。
- 文档依据当前前端代码可见逻辑，后端财务计算/记账规则需要独立来源确认，避免文档超出前端事实。
