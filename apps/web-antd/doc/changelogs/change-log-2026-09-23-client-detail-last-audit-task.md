# TAPD #1000169：客户详情按状态展示最后一轮审批流程与意见

## 背景

[需求 #1161580498001000169](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000169)：档案详情按 `clientStatus` 决定是否展示最后一次审核的流程和意见。

| clientStatus                                      | 详情页 |
| ------------------------------------------------- | ------ |
| 1 待审核 / 4 申请修改 / 3 已驳回 / 5 申请修改驳回 | 展示   |
| 2 已通过 / 0 未提交                               | 不展示 |
| `lastAuditTask == null`                           | 不展示 |

数据来自 `ClientAdmin/DetailAsync` 的 `lastAuditTask`，**不要**再调 `WorkFlowInstanceAdmin/GetAsync`。

## 改动

1. `client-admin.ts`：`ClientDto` 增加 `lastAuditTask`。
2. `client/base/form.vue`：
   - 档案页用 `lastAuditTask` 渲染右侧「审批信息」（提交/终审/申请原因/终审意见 + 审批路径）。
   - 已通过不展示；驳回也会展示。
   - 去掉误用的 `WorkFlowInstanceAdmin` 拉取。
   - 审核工作台（`?mode=audit`）仍用 `GetAuditDetail`。

## 验收

- 待审 / 申请修改中：详情可见路径与意见。
- 已驳回 / 申请修改驳回：可见驳回路径与意见。
- 已通过：看不到审批流程和意见。
- 未提交或 `lastAuditTask` 为空：不画空流程。
