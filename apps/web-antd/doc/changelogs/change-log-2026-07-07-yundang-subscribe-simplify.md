---
title: 海运运踪订阅接口简化对接
module: 海运出口 / 外部Api对接
author: auto-doc-sync
last_updated: 2026-07-07
---

# 1. 背景意图 (Background)

**白话解释：** 第三方运踪「海运运单批量订阅」接口文档更新：前端仅需传 `seaExportIds`，订阅场景/单号类型由后端根据海运出口 `BLType` 自动判断。本次移除前端参数弹窗中的单号类型、通知邮箱、高级场景等配置项，改为确认弹窗。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 API (`yundang-admin.ts`)

- `YundangOceanBatchSubscribeInputDto` 仅保留 `seaExportIds: string[]`。
- 移除 `YundangOceanSubscribeScene`、`YundangReferenceType` 枚举及导出。

## 2.2 订阅弹窗 (`yundang-subscribe-modal.vue`)

- 移除单号类型 Radio、通知邮箱、高级场景 Collapse。
- 保留：已选票数、编辑页「按已保存数据订阅」提示、超过 30 票分批提示。
- 新增：`autoSubscribeHint` 说明后端按装运方式自动选择订阅方式（整箱→船公司+主提单号；其他→船公司+第一个箱号）。
- 确认时仅提交 `{ seaExportIds }`。

## 2.3 未变更部分

- `use-yundang-ocean-subscribe.ts`：列表/编辑共用 composable 流程不变。
- `yundang-subscribe-result-modal.vue`：仍按 `items` 逐条展示成功/失败。
- 列表多选、编辑页单票入口、权限 `Admin.ExternalApi.Use` 不变。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT]
>
> 1. **勿再传 scene/referenceType**：后端已接管订阅方式判断，前端传多余字段可能被忽略或引发兼容问题。
> 2. **部分成功属正常**：一次请求可能部分 `items` 成功、部分失败，需遍历 `isSuccess` 与 `errorMessage`。
> 3. **编辑页未保存**：订阅仍读库内数据，与表单当前输入可能不一致。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-07 | `Refactor` | 运踪订阅弹窗简化为仅传 seaExportIds，移除场景/单号类型/邮箱配置 | 对齐新版第三方运踪前端对接文档；后端按 BLType 自动订阅 |
