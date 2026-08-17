---
title: 码头船舶改为查询后人工引入并保存
module: 海运出口 / 海运进口 / 外部Api对接
author: auto-doc-sync
last_updated: 2026-08-17
---

# 背景意图

后端把码头船舶从「同步写库」改成了纯查询：`FeituoAdmin/QueryTerminalScheduleAsync` 只传业务单 Id，返回该船在起运港的作业计划列表，**一个字段都不写**。用户从列表里选定后，由前端把可引入字段填到表单，再走海运出口/海运进口原有的编辑保存落库。

海运出口侧要求：点「码头船舶」后，有可引入数据就弹窗；点「确定引入」后自动回填并保存；没有可引入数据只提示。

# 核心逻辑变更

## 1. API 从 Sync 换成 Query

`src/api/schedule/feituo-terminal-schedule-admin.ts`

```
POST /services/app/FeituoAdmin/QueryTerminalScheduleAsync
入参：{ transportOrderId }
```

不再传 `selectedKey`，返回也不再带 `needSelect` / `applied` / `appliedItem` / `filledFields`。`items` 无数据时为空数组；`message` 仅未查到时有值。

## 2. 共享 composable 改为「查一次 + 有数据才弹窗」

`use-terminal-schedule-sync.ts` 不再二次调接口写库。查询后用 `bizType`（`0` 出口 / `1` 进口）把条目映射成表单补丁，**至少有一个可引入字段**才打开待选弹窗；否则 `message.warning`，不改表单。

即使只命中一条也弹窗，必须人工点「确定引入」，不默认取第一条。

## 3. 确定引入后由页面回填并保存

| 飞驼字段 | 海运出口表单 | 海运进口表单 |
| :-- | :-- | :-- |
| `atd` | `atd` 实际开船 | 进口表单无此字段，不填 |
| `evoyage` / `ivoyage` | `innerVoyno`（用 `evoyage`） | `innerVoyno`（用 `ivoyage`） |
| `cyClosing` | `closeVgmTime` 截港日期 | — |
| `portCloseDate` | `closeDocTime` 截单日期 | — |
| `customsCloseDate` | `closeManifestTime` 截关日期 | — |

缺值的键不写，避免把原值覆盖成空。回填后立刻走原有 `handleSubmit()`（`editSeaExport` / `editSeaImport`）。**不填 `etd`（计划离港）**，也**不把 `eta`/`ata` 当成预抵目的港**。

## 4. 弹窗列

展示：船名、航次、码头、船期状态（仅上海港有值时才出列）、计划离港、实际离港、开港、截港、截单、截关。查询条件 `vessel` / `voyage` / `portName` 回显在顶部 Alert。行定位键由前端拼，查询接口不再下发 `key`。

# 避坑指南

> [!IMPORTANT] **这是纯查询接口，调完不要当成已经落库。** 真正写库发生在用户点「确定引入」之后的编辑保存。保存失败（例如截关日期晚于开船日期）时，表单上已回填的值仍保留，用户改完再手动保存即可。

> [!WARNING] **`etd` 不要填开船日期，`eta`/`ata` 更不能填预抵。** `eta`/`ata` 是船抵达**起运港**（抵锚），比开船还早，拿去算箱使、转站会全错。

- 判进出口用返回的 `bizType`，不要用 `isExport`（没航次时它是 `null`）。
- 查不到时先核对业务单航次。返回里的 `voyage` 就是本次实际用的航次；清空业务单航次再查会退化成按船名+港口查全部。
- 海运进口经常查不到是正常现象：进口按起运港查，而起运港多为国外港口。
- 用户可见文案不出现「飞驼」。
- 报错文案仍由 `api/request.ts` 统一弹出（未填船名、未选起运港、起运港无 EDI 代码等）。

# 影响面

| 文件 | 变更 |
| :-- | :-- |
| `src/api/schedule/feituo-terminal-schedule-admin.ts` | Sync 改为 Query，去掉写库相关 DTO |
| `src/components/terminal-schedule/*` | 查询态 composable + 弹窗列/确定引入 |
| `src/views/sea-export-admin/basic-info-form/form.vue` | 选中后回填并 `handleSubmit` |
| `src/views/sea-import-admin/basic-info-form/form.vue` | 同上，仅回填航次 |
| `src/locales/langs/{zh-CN,en-US}/component.json` | 查询/引入文案 |
