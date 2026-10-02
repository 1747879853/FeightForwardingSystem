---
title: 发票开具
module: 结算管理
author: auto-doc-sync
last_updated: 2026-10-02
---

# 1. 业务背景说明 (Background)

发票开具新增及编辑页通过申请选择抽屉添加已提交的开票申请。路由为 /settlement-management/invoice-issue/add 与 /settlement-management/invoice-issue/:id/edit。列表展示关联业务主提单号（`mblNums`）。

# 2. 功能与操作说明 (Features & Operations)

按结算对象、申请单号、申请时间、发票抬头、币别和申请人查询。筛选变化时清理旧选择；重置或重新打开时使旧请求失效。加载期间禁止确认。列表「发票号」后展示「提单号」列，取接口 `mblNums` 顿号拼接。抽屉费用明细展示原币币别。列表拖宽列时固定其余列宽，不挤压邻列。列表与编辑页不展示「发票状态」（`combinedStatus`）；税局开票等按钮仍按接口 `issueStatus` 判断。

新建/编辑页右上角提供「保存」「保存并新建」：普通保存行为不变（新建成功进编辑页）；「保存并新建」在校验通过并落库后进入空白新建页，便于财务连续开票。已锁定（`editLocked`）时两按钮均禁用。

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
| mblNums | 列表提单号 | GetPagedListAsync | 多票顿号拼接展示 | 空数组显示 `-` |

# 5. 核心业务卡点 (Business Blockers)

加载期间不能确认；查询条件变化不能保留上一次勾选。选择结算对象后的固定规则保持原有行为。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| --- | --- | --- | --- |
| 2026-10-02 | `Fix` | 列表与编辑页去掉「发票状态」列/筛选/展示。 | 后端 `issueStatus`/`combinedStatus` 仍用于税局开票等逻辑。详见[变更记录](../../changelogs/change-log-2026-10-02-invoice-issue-hide-combined-status.md)。 |
| 2026-10-02 | `Feature` | 新建/编辑页右上角增加「保存并新建」，保存成功后进入空白新建页。 | 新建页同路由用 `refreshTab` 重挂载；编辑页 `push` 新建后 `closeTabByKey` 关编辑 tab。详见[变更记录](../../changelogs/change-log-2026-10-02-invoice-issue-save-and-new.md)。 |
| 2026-10-02 | `Feature` | 选申请抽屉费用明细增加「原币币别」。 | TAPD #1000204。绑费用 `currencyCode`。详见[变更记录](../../changelogs/change-log-2026-10-02-tapd-1000204-invoice-issue-fee-orig-currency.md)。 |
| 2026-10-02 | `Fix` | 列表拖列宽改用固定模式，不再挤压邻列；NestedDataTable 同步按列宽撑开可横滚。 | TAPD #1001037。详见[变更记录](../../changelogs/change-log-2026-10-02-tapd-1001037-invoice-issue-col-resize-fixed.md)。 |
| 2026-10-02 | `Feature` | 列表增加「提单号」列，展示关联业务主提单号。 | TAPD #1000200。绑 `mblNums`。详见[变更记录](../../changelogs/change-log-2026-10-02-tapd-1000200-invoice-issue-mbl-nums.md)。 |
| 2026-09-30 | `Perf` | 列表分页改大后只绘制可见行列，不再深拷贝整页数据。 | 开启 virtualX/Y（gt: 0），行高 40，去掉无编辑用途的 keepSource。详见[变更记录](../../changelogs/change-log-2026-09-30-其余业务列表虚拟滚动.md)。 |
| 2026-09-19 | Fix | #0916 延伸：查询及重新打开清理旧选择 | 查询范围比较并拒绝旧响应 |
