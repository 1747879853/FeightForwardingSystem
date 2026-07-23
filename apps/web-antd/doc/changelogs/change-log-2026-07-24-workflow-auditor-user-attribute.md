# 工作流审核人仅选用户属性时才提交 userAttribute-2026-07-24

## 背景意图

- 编辑/保存工作流（`WorkFlowAdmin/EditAsync`）时，审核人选「用户」或「角色」也会带上 `userAttribute: 0`。
- 后端期望：只有真正选择了用户属性时，请求体才包含 `userAttribute`。

## 核心逻辑变更

- `approver-drawer.vue` 的 `buildAuditors`：用户/角色分支不再写入 `userAttribute`；仅用户属性分支写入具体属性值。
- `converter.js`：
  - `flattenSelectionsToAuditors` / `uiNodeUserListToAuditors` 同步上述规则；
  - 新增 `sanitizeAuditorForApi`，在 `uiNodeToApiNode` 出口统一剥离 `0`/`空` 的 `userAttribute`，避免详情回显后未重开抽屉仍把 `0` 提交出去。

## 避坑指南

- 判定有效用户属性用 `!= null && !== 0`，与回显推断 `inferApproverType` 保持一致。
- 保存链路以 `treeToFlat` → `uiNodeToApiNode` 为准；抽屉内组装与转换器两边都要干净。
