---
title: 海运出口运单批量运踪订阅前端对接
module: 海运出口 / 外部Api对接
author: auto-doc-sync
last_updated: 2026-07-07
---

# 1. 背景意图 (Background)

**白话解释：** 在海运出口列表与编辑页对接第三方运踪「海运运单批量订阅」接口。操作员勾选多票（或编辑页单票）发起订阅，配置单号类型与可选高级场景，提交后展示逐条成功/失败结果；跟踪动态由后端推送回写，前端不负责展示。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 API

- 新增 `src/api/yundang/yundang-admin.ts`：`batchSubscribeOceanBill` → `POST services/app/YundangAdmin/BatchSubscribeOceanBillAsync`。
- 枚举：`YundangOceanSubscribeScene`（0–5）、`YundangReferenceType`（BL/BK/CN）。

## 2.2 共享流程

- `use-yundang-ocean-subscribe.ts`：`openSubscribe` → 参数弹窗 → 调接口 → toast 汇总 → 结果 Modal 表格。
- `yundang-subscribe-modal.vue`：默认 `referenceType` + `noticeEmail`；「高级选项」折叠 `scene`；History/SpecifiedContainer/Sino 与单号类型联动校验。
- `yundang-subscribe-result-modal.vue`：按 `items` 展示委托/单号、referenceNo、箱号、状态、失败原因。

## 2.3 列表 (`list.vue`)

- `radioConfig` 改为 `checkboxConfig` 多选；编辑/删除/复制要求恰好选中 1 行；「运踪订阅」支持多选。
- 权限：`Admin.ExternalApi.Use`；选中超过 30 票时弹窗内提示（后端自动分批）。

## 2.4 编辑页 (`form.vue`)

- 基础信息 Tab 工具栏「打印」与「取消」之间增加「运踪订阅」（仅 `isEdit` + `Admin.ExternalApi.Use`）。
- 弹窗提示：按已保存数据订阅，不含未保存修改。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT]
>
> 1. **权限独立**：订阅用 `Admin.ExternalApi.Use`，与 `Admin.SeaExport` 编辑权限无关。
> 2. **重复订阅**：前端不拦截；后端按判重键更新，结果 Modal 逐条展示。
> 3. **一票多明细**：SpecifiedContainer/History 等场景下一票可展开多条 `items`，结果表格按明细行展示而非按票一行。
> 4. **编辑页未保存**：订阅读库内数据，与表单当前输入可能不一致，弹窗已提示。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-07 | `Feature` | 海运出口列表多选 + 编辑页单票对接第三方运踪批量订阅，参数弹窗与结果 Modal | composable 统一列表/编辑入口；API 独立 `api/yundang/` |
