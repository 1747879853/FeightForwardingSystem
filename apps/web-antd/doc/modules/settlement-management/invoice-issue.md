---
title: 发票开具
module: 结算管理
author: auto-doc-sync
last_updated: 2026-09-19
---

# 1. 业务背景说明 (Background)

发票开具新增及编辑页通过申请选择抽屉添加已提交的开票申请。路由为 /settlement-management/invoice-issue/add 与 /settlement-management/invoice-issue/:id/edit。

# 2. 功能与操作说明 (Features & Operations)

按结算对象、申请单号、申请时间、发票抬头、币别和申请人查询。筛选变化时清理旧选择；重置或重新打开时使旧请求失效。加载期间禁止确认。

# 3. 状态流转说明 (Status Transitions)

| 当前状态   | 触发人/动作    | 目标状态 | 状态说明           |
| ---------- | -------------- | -------- | ------------------ |
| 已勾选申请 | 修改条件并查询 | 未选择   | 避免旧选择重新出现 |
| 加载中     | 最新请求完成   | 可选择   | 旧请求结果不回写   |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 字段含义说明 | 数据来源 | 联动规则 | 校验限制 |
| --- | --- | --- | --- | --- |
| selectedAppRowKeys | 已选申请 ID | 用户勾选 | 查询范围变化清空 | 保留已有申请可选性校验 |
| applicationGroupsData | 当前申请列表 | getSubmittedApplicationList | 最新请求更新 | 确认仅处理当前结果 |

# 5. 核心业务卡点 (Business Blockers)

加载期间不能确认；查询条件变化不能保留上一次勾选。选择结算对象后的固定规则保持原有行为。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| --- | --- | --- | --- |
| 2026-09-19 | Fix | #0916 延伸：查询及重新打开清理旧选择 | 查询范围比较并拒绝旧响应 |
