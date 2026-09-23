# TAPD #1000167：客户审核「审批路径」放到右侧栏底部

## 背景

[需求 #1161580498001000167](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000167)：客户管理审核时，审批信息放到页面右下角。

## 改动

`views/client/base/form.vue`：去掉主内容区顶部「审批路径」，挪到右侧「干系人信息」卡片底部（结算对账下方）。

## 后续

档案详情的数据源与显隐规则由 [TAPD #1000169](./change-log-2026-09-23-client-detail-last-audit-task.md) 改为 `DetailAsync.lastAuditTask`，并按 `clientStatus` 控制展示。
