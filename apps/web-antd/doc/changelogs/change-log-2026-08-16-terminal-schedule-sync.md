---
title: 海运进出口对接飞驼码头船舶计划同步
module: 海运出口 / 海运进口 / 外部Api对接
author: auto-doc-sync
last_updated: 2026-08-16
---

# 背景意图

海运出口、海运进口的开船日期、航次、截港/截单/截关等日期，此前只能人工去码头或飞驼系统查了再手抄回单据，既慢又容易抄错。后端新增 `FeituoAdmin/SyncTerminalScheduleAsync` 一个接口打通飞驼「码头船舶计划」，本次前端在两张编辑页的**船名/航次字段右侧**加一个同步按钮，把「查询 → 选择 → 回填 → 刷新」串成一次点击。

关键前提：**这个接口会写库**，不是只读查询。它按业务单自己的船名、航次、起运港 EDI 代码去飞驼查，命中唯一一条就直接回填单据；返回多条时一个字段都不写，要用户选定后带 `key` 再调一次。所以前端必须区分 `applied` 与 `needSelect`，并且只在 `applied` 为真时刷新单据。

# 核心逻辑变更

## 1. 新增 API 封装

`src/api/schedule/feituo-terminal-schedule-admin.ts`

```
POST /services/app/FeituoAdmin/SyncTerminalScheduleAsync
入参：{ transportOrderId, selectedKey? }
```

船名、航次、起运港代码、进出口标识**全部由后端从业务单取**，前端一个都不传，`selectedKey` 只在第二次调用时带。返回 `SyncTerminalScheduleResultDto` 含 `items` / `needSelect` / `applied` / `appliedItem` / `filledFields` / `message`，以及后端本次实际使用的 `vessel` / `voyage` / `portName`（用于让用户核对为什么查不到）。

## 2. 新增共享组件 `src/components/terminal-schedule/`

| 文件 | 职责 |
| :-- | :-- |
| `use-terminal-schedule-sync.ts` | 「最多两次调用」的状态机，出口/进口共用 |
| `terminal-schedule-picker-modal.vue` | 多条待选时的单选弹窗（`a-table` + `row-selection.type: 'radio'`） |
| `index.ts` | barrel |

composable 入参 `{ transportOrderId, onApplied }`，返回 `{ syncing, pickerOpen, pickerItems, queryInfo, sync, confirmPick, canSync }`。三种结果分支严格对齐接口文档：

| 情况 | 判断 | 前端动作 |
| :-- | :-- | :-- |
| 未查到 | `items.length === 0` | `message.warning(result.message)`，关弹窗，**不刷新** |
| 唯一一条已回填 | `applied === true` | notification 逐条列出 `filledFields`（`字段中文名：旧值 → 新值`），随后 `await onApplied()` 重新拉详情 |
| 多条待选 | `needSelect === true` | 用 `items` 打开单选弹窗，**不刷新**（此时一个字段都没写） |

`onApplied` 在出口、进口页分别接到各自的 `loadEditData()`，走完整详情回填流程。

## 3. `VesselVoyageInput` 增加可选操作按钮

`src/adapter/component/vessel-voyage-input.vue` 新增 `actionVisible` / `actionLoading` / `actionDisabled` / `actionTitle` / `actionIcon` 五个可选 prop 与 `action` emit。不传 `actionVisible` 时组件渲染与改动前完全一致，空运等其他复用方不受影响。

## 4. 两张编辑页接入

- 出口 `sea-export-admin/basic-info-form/form.vue`
- 进口 `sea-import-admin/basic-info-form/form.vue`

按钮仅在**编辑态**（`isEdit`，即路由带业务单 Id）显示；新建页尚无业务单 Id，接口没法调，直接不渲染。

出口侧额外做了一处收敛：原本 `vessel` 的 `componentProps` 工厂函数在**两个地方各写了一份**（`useVbenForm` 的 schema 初始化处，以及 `applyServiceLockedFields` 里服务锁定回写处），本次抽成统一的 `buildVesselComponentProps({ disabled })`。

## 5. 文案

新增 `component.terminalSchedule.*`（zh-CN / en-US）。放在共享的 `component.json` 而非 `seaExport.json`/`seaImport.json`，避免出口进口两份重复文案。

用户侧产品名是 **「码头船舶」**，不是「码头船期」。按钮 Tooltip、同步中提示、回填成功通知标题都用这个叫法。**用户可见文案不出现「飞驼」**（弹窗多条提示写「匹配到多条码头船舶计划」）；接口路径、类型名、内部文档仍可写飞驼。后端 `error.message` 若自带「飞驼」会原样弹出，需后端改文案。

# 避坑指南

> [!IMPORTANT] **`needSelect=true` 时后端一个字段都没写。** 别看到 `success: true` 就以为回填了，必须看 `applied`。这一步如果误刷新详情，用户会以为同步失败（页面数据没变）。

> [!IMPORTANT] **出口 `vessel` 的 `componentProps` 必须保持函数形态。** `VesselVoyageInput` 靠 `componentProps(values, formApi)` 拿 `values.innerVoyno` 显示航次、拿 `formApi` 写回航次。`applyServiceLockedFields` 里若用静态对象 `updateSchema` 覆盖，航次会显示丢失且无法写回。本次抽出的 `buildVesselComponentProps` 就是为了防止这两处再次配置漂移——**以后给船名/航次加任何 prop，改这一个工厂即可**。

- **`key` 必须原样回传**，不要自己拼、也不要用数组下标。后端第二次会重新查飞驼再按 `key` 匹配；飞驼数据变了会报「所选船舶计划不在飞驼本次返回结果中，请重新查询后再选」。composable 对第二次调用失败会主动关掉待选弹窗，逼用户重走首次查询流程，避免拿着过期列表反复点。
- **`eta`/`ata` 不是预抵目的港**，是「船抵达起运港(抵锚)」，比开船还早。弹窗列头写的是「抵起运港(计划)」，不要改回「预抵」，更不要拿它算箱使、转站日期。
- **`status` 只有上海港有值**，其它港口是 `null`。弹窗做了动态判断：全列为空时**不渲染该列**，不要改成必显示列。
- **所有时间都是字符串** `yyyy-MM-dd HH:mm:ss`，要排序或做日期计算得自己转。弹窗展示用 `slice(0, 16)` 去掉秒。
- **回填不覆盖成空。** 飞驼某字段返回 `null` 时，业务单原有值保持不变，所以 `filledFields` 可能比预期少，属正常。
- **查不到时先核对业务单航次。** 后端拿业务单上的航次去查，飞驼口径（出口形如 `1173069E`、进口形如 `E068`）和手填的不一定一致，不一致就返回 0 条。弹窗顶部 Alert 展示后端返回的 `vessel`/`voyage`/`portName` 就是给用户核对用的；把业务单航次清空再同步会退化成「查全部、多条手选」。
- **海运进口经常查不到是正常现象**，不是 bug。进口按起运港查，而起运港多为国外港口，飞驼的码头船舶计划以国内港区为主。
- **报错文案不用业务层再弹。** `api/request.ts` 的 `errorMessageResponseInterceptor` 已统一 `message.error(abpError.message)`，composable 的 `catch` 只做状态收尾。

# 影响面

| 文件 | 变更 |
| :-- | :-- |
| `src/api/schedule/feituo-terminal-schedule-admin.ts` | 新增 |
| `src/components/terminal-schedule/*` | 新增（3 个文件） |
| `src/adapter/component/vessel-voyage-input.vue` | 新增可选 action 按钮，默认关闭，向后兼容 |
| `src/views/sea-export-admin/basic-info-form/form.vue` | 接入 + 收敛 `vessel` componentProps 工厂 |
| `src/views/sea-import-admin/basic-info-form/form.vue` | 接入 |
| `src/locales/langs/{zh-CN,en-US}/component.json` | 新增 `terminalSchedule` 文案 |
