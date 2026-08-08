# 工作流条件字段对齐后端新枚举（费用类共用 9 个条件）

## 背景意图

后端重构 `TaskTypeCondition`：费用提交与费用变更共用同一套费用条件（可比较字段完全相同），并新增收付类型、业务类型、利润、利润率与三个「应收应付费用名缺失/倒挂」判断；原先占位的段位值 `SubmitOrderFee=0`、`ModifyOrderFee=1000`、`DeleteOrderFee=2000`、`PaymentApplication=3000` 全部废弃。前端条件抽屉此前只支持用户/组织两种值输入，无法配置新字段。

## 核心逻辑变更

- `api/system/workflow-admin.ts`
  - `TaskTypeCondition` 改为：`OrderFeeUserId=1`、`OrderFeeOrgID=2`、`OrderFeePaySide=4`、`OrderFeeBizType=5`、`OrderFeeProfit=6`、`OrderFeeProfitRate=7`、`OrderFeeHasReceiveLessThanPay=8`、`OrderFeeHasPayWithoutReceive=9`、`OrderFeeHasReceiveWithoutPay=10`、`PaymentApplicationUserId=3001`、`PaymentApplicationOrgID=3002`、`PreOrderUserId=8001`、`PreOrderOrgID=8002`。
  - 新增条件元数据能力：`getConditionFieldLabel`（字段展示名）、`getConditionValueKind`（值形态 `user`/`org`/`enum`/`number`/`none`）、`getConditionEnumOptions`（收付类型、业务类型可选值）、`getShouldBeOptionsForCondition`（按字段限定介词）、`getShouldBeLabel`。
  - `getTaskTypeConditionOptions`：费用提交与费用变更返回同一套 9 个费用条件；付费申请只剩 3001/3002；业务联系单仍为 8001/8002。
- 新增 `views/system/workflow/modules/drawers/condition-value-input.vue`：按 `getConditionValueKind` 渲染用户下拉 / 组织下拉 / 枚举下拉 / 数值输入 / 「无需填值」提示，并通过 `update` 事件回传 `{ value, valueText }`（不直接改 props）。
- `condition-drawer.vue`：条件字段与介词选项全部改为按 `store.taskType` 从 API 层派生；切换字段时自动带上该字段的第一个合法介词；`none` 类条件不再要求填值（校验与展示文案同步放行）；未选任务类型时给出「请先选择任务类型」提示；打开抽屉时丢弃不属于当前任务类型的历史条件（含已废弃段位值）。
- `form.vue`：顶部任务类型的 `@change`（仅用户手动切换）会递归清空各分支已配置的条件并标红提示，避免把不属于新类型的条件提交给后端；详情加载阶段不触发，回显不受影响。
- `utils/func.ts`：节点上的条件摘要不再维护本地 `fieldMap` / `shouldBeMap`，统一走 API 层标签函数。
- `utils/converter.js`：`apiConditionsToUi` 按值形态回显——枚举/数值转 `number`，用户与组织 ID 保持字符串（避免雪花 ID 被 `Number()` 破坏精度），`none` 类条件值置空。

## 避坑指南

- 介词是按字段强绑定的：用户等于/不等于、组织属于/不属于、枚举等于/不等于、数值仅四种大小比较、`none` 类仅是/不是。不要放开成全量 `ShouldBe`，后端会拒。
- 利润率传的是百分比数值（`15` 表示 15%）；后端在应付合计为 0 时该条件一律判为不满足。
- 8/9/10 三个条件不需要被比较值，保存时 `value` 必须为 `null`，前端已在校验与提交链路放行，不要再补默认值。
- 「业务所属人/组织」取业务单 `TransportOrder.UserId` / `OrgId`（组织会展开下级），不是点提交的人，条件文案不要写成「提交人」。
- 历史工作流若存有已废弃的段位值（0/1000/2000/3000），条件下拉不再包含它们，打开条件抽屉即被丢弃，需要重新配置该工作流。
- 切换任务类型是破坏性操作：会清空所有分支已配好的条件（各类型字段集互不相通）。若只是想改名或改启用状态，不要顺手动任务类型。
