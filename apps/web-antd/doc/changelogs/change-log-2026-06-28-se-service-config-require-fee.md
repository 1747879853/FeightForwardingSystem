# 海运出口港口服务项配置 新增「必填费用」对接

- 日期：2026-06-28
- 类型：Feature
- 影响页面：`/basic-data/se-service-config`（港口服务项配置）
- 关联接口：`SeServiceConfigAdmin` 的 `AddAsync` / `EditAsync` / `DetailAsync` / `GetPagedListAsync` / `DeleteAsync`

## 背景意图

后端为 `SeServiceConfigItem` 新增 `RequireFee` 开关与子表 `SeServiceRequireFee`，用于配置「完成该服务任务时必须存在的费用」（区分应收/应付）。完成任务时由后端校验当前海运出口 `OrderFee` 是否包含配置要求的费用，缺失则拒绝完成并返回缺少的费用清单。

本次前端只负责**配置侧对接**：在服务项明细新增「必填费用」开关，开启后可分别为「应收费用名称」「应付费用名称」绑定多个费用代码；完成任务的校验与提示由后端实现，前端无需在工作台侧改造。

## 核心逻辑变更

1. **API DTO（`api/system/base-data/se-service-config-admin.ts`）**
   - 新增 `SeServiceRequireFeeAddDto`（`paySide`、`feeCodeId`）、`SeServiceRequireFeeEditDto`（含可选 `id`）、`SeServiceRequireFeeDto`（输出含 `feeCodeName`）。
   - `SeServiceConfigItemAddDto` / `SeServiceConfigItemEditDto` 新增 `requireFee` 与 `seServiceRequireFees`。
   - `SeServiceConfigItemListDto` / `SeServiceConfigItemDetailDto` 新增 `requireFee`；详情新增 `seServiceRequireFees`。

2. **表单（`SeServiceConfigAdmin/modules/form.vue`）**
   - `ItemRow` 新增 `requireFee` 与 `seServiceRequireFees`（`RequireFeeRow` = `{ id?, paySide, feeCodeId, feeCodeName? }`）。
   - 服务项开关区新增「必填费用」`Switch`；开启后展示「应收费用名称」「应付费用名称」两个 `FeeCodeSelect`（`mode="multiple"`），分别对应 `paySide=0/1`。
   - 提交时按开关状态组装 `seServiceRequireFees`（关闭则提交空数组）；编辑保留每条 `id`，遵循「有 id 改、无 id 增、缺失删」差异更新。
   - 回显时由详情 `seServiceRequireFees` 还原，`feeCodeName` 通过 `selected-items` 注入 `FeeCodeSelect` 完成标签回显。

3. **i18n**：`system.json`（中/英）新增 `requireFee`、`requireReceiveFees`、`requirePayFees`、`requireFeeTip`。

## 避坑指南

- `feeCodeId` 为后端 `long`，前端统一保持下拉返回的原始值（number/string）不做强转，比对差异时按 `String(feeCodeId)` 归一，避免大整型精度问题。
- 收付类型常量：`REQUIRE_FEE_PAY_SIDE_RECEIVE = 0`（应收）、`REQUIRE_FEE_PAY_SIDE_PAY = 1`（应付），与 `orderFee` 的 `getPaySideOptions` 口径一致。
- 「必填费用」关闭时提交空 `seServiceRequireFees`，避免后端残留历史绑定仍参与完成校验。
- 完成任务的费用校验与缺失提示由后端负责，前端不在工作台/完成按钮处重复实现。
